angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.DashboardController',
    [
        '$window', '$location', 'deployNavigation', 'deployConfiguration', 'contentResource',
        function($window, $location, deployNavigation, deployConfiguration, contentResource) {

            var vm = this;

            vm.config = deployConfiguration;
            vm.showStarterKitSelector = true;

            vm.openProject = openProject;
            vm.openDocumentation = openDocumentation;
            vm.selectStarterKit = selectStarterKit;

            function init() {
                openStarterKitSelector();
            }

            function openProject() {
                $window.open("https://www.s1.umbraco.io/project/" + vm.config.ProjectAlias);
            };

            function openDocumentation() {
                $window.open("https://our.umbraco.org/Documentation/Umbraco-Cloud/");
            };

            function openStarterKitSelector() {
                if ($location.search().dashboard !== "starter") {
                    vm.showStarterKitSelector = false;
                    return;
                }

                //Check localStorage for selected starterKit even though
                //the ?dashboard=starter querystring is present
                if (localStorage.starterKit) {
                    vm.showStarterKitSelector = false;
                } else {
                    //only show the message if there is no content
                    contentResource.getChildren(-1).then(function (response) {
                        if (!response.items || response.items.length === 0) {
                            vm.showStarterKitSelector = true;
                        }
                    });
                }
            }

            function selectStarterKit(starterkitName) {
                //Set the starterkit name in localStorage so we know
                //not to show the overlay/selector again.
                localStorage.starterKit = starterkitName;
                //TODO Fix this - currently doesn't seem to remove the querystring
                $location.search('dashboard', null);
                window.location.reload(true);
            }

            init();

            vm.navigation = deployNavigation;
        }
    ]);
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.AddToQueueDialogController',
    [
        '$scope', 'deployConfiguration', 'deployQueueService', 'navigationService', 'deployHelper',
        function($scope, deployConfiguration, deployQueueService, navigationService, deployHelper) {
            var vm = this;

            vm.deployConfiguration = deployConfiguration;
            vm.addedToQueue = false;
            vm.includeDescendants = false;
            vm.item = $scope.currentNode;

            vm.addToQueue = function(item) {
                var deployItem = deployHelper.getDeployItem(vm.item, vm.includeDescendants);
                deployQueueService.addToQueue(deployItem);
                vm.addedToQueue = true;
            };

            vm.closeDialog = function() {
                navigationService.hideDialog();
            };
        }
    ]);
(function () {
    "use strict";

    function DeployDialogController($scope, deployResource, deploySignalrService, angularHelper, deployHelper, deployService, deployConfiguration) {

        var vm = this;

        vm.config  = deployConfiguration;
        vm.currentNode = $scope.dialogOptions.currentNode;
        vm.deploy = {};
        vm.includeDescendants = false;

        vm.startInstantDeploy = startInstantDeploy;
        vm.resetDeploy = resetDeploy;

        function onInit() {
            // reset the deploy progress
            resetDeploy();
        };

        function startInstantDeploy() {

            var deployItem = deployHelper.getDeployItem(vm.currentNode, vm.includeDescendants);

            deployService.instantDeploy(deployItem).then(function (data) {
                vm.deploy.status = 'inProgress';
            }, function (error) {

                //Catching the 500 error from the request made to the UI/API Controller to trigger an instant deployment
                //Other errors will be caught in 'deploy:sessionUpdated' event pushed out

                //We don't have ClassName in our Exception here but ExceptionType is what we have
                //Push in the value manually into our error/exception object
                error['ClassName'] = error.ExceptionType;

                vm.deploy.status = 'failed';
                vm.deploy.error = {
                    hasError: true,
                    comment: error.Message,
                    exception: error
                };

            });
        };

        function resetDeploy() {
            vm.deploy = {
                'deployProgress': 0,
                'currentActivity': '',
                'status': '',
                'error': {}
            };
        };

        $scope.$on('deploy:sessionUpdated', function (event, args) {

            // make sure the event is for us
            if (args.sessionId === deployService.sessionId) {
                angularHelper.safeApply($scope, function () {

                    vm.deploy.deployProgress = args.percent;
                    vm.deploy.currentActivity = args.comment;
                    vm.deploy.status = deployHelper.getStatusValue(args.status);

                    if (vm.deploy.status === 'failed' || 
                        vm.deploy.status === 'cancelled' ||
                        vm.deploy.status === 'timedOut') {

                        vm.deploy.error = {
                            hasError: true,
                            comment: args.comment,
                            log: args.log,
                            exception: args.exception
                        };
                    }
                });
            }
            
        });

        onInit();
    }

    angular.module("umbraco.deploy").controller("UmbracoDeploy.DeployDialogController", DeployDialogController);
})();
(function () {
    "use strict";

    function PartialRestoreDialogController($scope, deploySignalrService, deployService, angularHelper, deployConfiguration, deployHelper) {

        var vm = this;

        vm.config = deployConfiguration;
        vm.restoreWorkspace = {};
        vm.restore = {};
        vm.loading = true;

        vm.selectable = $scope.currentNode.id === "-1";
        if (vm.selectable === false) {
            vm.loading = false;
        }
        vm.changeDestination = changeDestination;
        vm.startRestore = startRestore;
        vm.resetRestore = resetRestore;

        var nodeUdis = [];

        function onInit() {
            // reset restore progress
            resetRestore();

            // set the last workspace to restore from as default
            if(vm.config.RestoreWorkspaces) {
                //var lastWorkspaceIndex = vm.config.Workspaces.length - 1;
                vm.restoreWorkspace = _.last(vm.config.RestoreWorkspaces);//[lastWorkspaceIndex];
            }

            if (vm.selectable === true) {
                vm.loading = true;
                deployService.getSitemap(vm.restoreWorkspace.Url).then(function(data) {
                    vm.sitemap = data;
                    vm.loading = false;
                });
            }
        }

        function changeDestination(workspace) {
            vm.restoreWorkspace = workspace;
            if (vm.selectable === true) {
                vm.loading = true;
                deployService.getSitemap(vm.restoreWorkspace.Url).then(function(data) {
                    vm.sitemap = data;
                    vm.loading = false;
                });
            }
        }

        function startRestore(workspace) {

            var restoreNodes = [];

            if (vm.selectable === true) {
                _.each(nodeUdis,
                    function (o, i) {
                        restoreNodes.push({ id: o, includeDescendants: true });
                    });

            } else {
                restoreNodes = [
                    {
                        id: $scope.currentNode.id,
                        includeDescendants: true
                    }
                ];
            }

            deployService.partialRestore(workspace.Url, restoreNodes)
                .then(function(data) {
                        vm.restore.status = 'inProgress';
                    },
                    function (error) {
                        //Catching the 500 error from the request made to the UI/API Controller to trigger an instant deployment
                        //Other errors will be caught in 'restore:sessionUpdated' event pushed out

                        //We don't have ClassName in our Exception here but ExceptionType is what we have
                        //Push in the value manually into our error/exception object
                        error['ClassName'] = error.ExceptionType;

                        vm.restore.status = 'failed';
                        vm.restore.error = {
                            hasError: true,
                            comment: error.Message,
                            exception: error
                        };
                    });

        }

        function resetRestore() {
            vm.restore = {
                'restoreProgress': 0,
                'targetName': '',
                'currentActivity': '',
                'status': '',
                'error': {}
            };
        }

        $scope.$on('restore:sessionUpdated', function (event, args) {
            // make sure the event is for us
            if (args.sessionId === deployService.sessionId) {

                angularHelper.safeApply($scope, function () {

                    vm.restore.restoreProgress = args.percent;
                    vm.restore.currentActivity = args.comment;
                    vm.restore.status = deployHelper.getStatusValue(args.status);
                    
                    if (vm.restore.status === 'failed' || 
                        vm.restore.status === 'cancelled' ||
                        vm.restore.status === 'timedOut') {
                        vm.restore.error = {
                            hasError: true,
                            comment: args.comment,
                            log: args.log,
                            exception: args.exception
                        };
                    }
                });
            }
        });

        vm.selectNode = function (node, event) {
            var newArray = [];
            if (!node.selected) {
                node.selected = true;
                nodeUdis.push(node.Udi);
            } else {
                angular.forEach(nodeUdis, function (nodeUdi) {
                    if (nodeUdi !== node.Udi) {
                        newArray.push(nodeUdi);
                    }
                });
                node.selected = false;
                nodeUdis = newArray;
            }
            event.stopPropagation();
        };
        onInit();
    }

    angular.module("umbraco.deploy").controller("UmbracoDeploy.PartialRestoreDialogController", PartialRestoreDialogController);
})();
(function () {
    "use strict";

    function RestoreDialogController($scope, deploySignalrService, deployService, angularHelper, deployConfiguration, deployHelper) {

        var vm = this;

        vm.config = deployConfiguration;
        vm.restoreWorkspace = {};
        vm.restore = {};
        
        vm.changeDestination = changeDestination;
        vm.startRestore = startRestore;
        vm.resetRestore = resetRestore;

        function onInit() {

            // reset restore progress
            resetRestore();

            // set the last workspace to restore from as default
            if(vm.config.RestoreWorkspaces) {
                vm.restoreWorkspace = _.first(vm.config.RestoreWorkspaces);
            }
        }

        function changeDestination(workspace) {
            vm.restoreWorkspace = workspace;
        }

        function startRestore(workspace) {

            deployService.restore(workspace.Url)
                .then(function(data) {
                        vm.restore.status = 'inProgress';
                    },
                    function (error) {
                        //Catching the 500 error from the request made to the UI/API Controller to trigger an instant deployment
                        //Other errors will be caught in 'restore:sessionUpdated' event pushed out

                        //We don't have ClassName in our Exception here but ExceptionType is what we have
                        //Push in the value manually into our error/exception object
                        error['ClassName'] = error.ExceptionType;

                        vm.restore.status = 'failed';
                        vm.restore.error = {
                            hasError: true,
                            comment: error.Message,
                            exception: error
                        };
                    });
        }

        function resetRestore() {
            vm.restore = {
                'restoreProgress': 0,
                'targetName': '',
                'currentActivity': '',
                'status': '',
                'error': {}
            };
        }

        $scope.$on('restore:sessionUpdated', function (event, args) {
            
            // make sure the event is for us
            if (args.sessionId === deployService.sessionId) {

                angularHelper.safeApply($scope, function () {

                    vm.restore.restoreProgress = args.percent;
                    vm.restore.currentActivity = args.comment;
                    vm.restore.status = deployHelper.getStatusValue(args.status);
                    
                    if (vm.restore.status === 'failed' || 
                        vm.restore.status === 'cancelled' ||
                        vm.restore.status === 'timedOut') {

                        vm.restore.error = {
                            hasError: true,
                            comment: args.comment,
                            log: args.log,
                            exception: args.exception
                        };
                    }
                });
            }
        });
        onInit();
    }
    angular.module("umbraco.deploy").controller("UmbracoDeploy.RestoreDialogController", RestoreDialogController);
})();
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.AddWorkspaceController',
    [
        function() {
            var vm = this;

            vm.openAddEnvironment = function() {
                //window.open("https://www.s1.umbraco.io/project/" + vm.environment.alias + "?addEnvironment=true");
                alert('not implemented');
            }
        }
    ]);
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.DebugController',
    [
        '$scope', 'angularHelper', 'deployService',
        function ($scope, angularHelper, deployService) {

            var vm = this;

            vm.trace = 'DEBUG:<br /><br />';

            vm.clear = function() { vm.trace = 'DEBUG:<br /><br />'; };

            // beware, MUST correspond to what's in WorkStatus
            var workStatus = [ "Unknown", "New", "Executing", "Completed", "Failed", "Cancelled", "TimedOut"];

            // note: due to deploy.service also broadcasting at beginning, the first line could be duplicated
            $scope.$on('deploy:sessionUpdated', updateLog);
            $scope.$on('restore:sessionUpdated', updateLog);

            function updateLog(event, sessionUpdatedArgs) {
                // make sure the event is for us
                if (deployService.isOurSession(sessionUpdatedArgs.sessionId)) {
                    angularHelper.safeApply($scope, function () {
                        var progress = sessionUpdatedArgs;
                        vm.trace += "" + progress.sessionId.substr(0, 8) + " - " + workStatus[progress.status] + ", " + progress.percent + "%"
                            + (progress.comment ? " - <em>" + progress.comment + "</em>" : "") + "<br />";
                        if (progress.log)
                            vm.trace += "<br />" + filterLog(progress.log) + "<br /><br />";
                        //console.log("" + progress.sessionId.substr(0, 8) + " - " + workStatus[progress.status] + ", " + progress.percent + "%");
                    });
                }
            }

            function filterLog(log) {
                log = log.replace(/(?:\&)/g, '&amp;');
                log = log.replace(/(?:\<)/g, '&lt;');
                log = log.replace(/(?:\>)/g, '&gt;');
                log = log.replace(/(?:\r\n|\r|\n)/g, '<br />');
                log = log.replace(/(?:\t)/g, '  ');
                log = log.replace('-- EXCEPTION ---------------------------------------------------', '<span class="umb-deploy-debug-exception">-- EXCEPTION ---------------------------------------------------');
                log = log.replace('----------------------------------------------------------------', '----------------------------------------------------------------</span>');
                return log;
            }
        }
    ]);
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.DoneController',
    [
        'deployConfiguration', 'deployNavigation',
        function (deployConfiguration, deployNavigation) {
            var vm = this;

            vm.targetName = deployConfiguration.targetName;
            vm.targetUrl = deployConfiguration.targetUrl;

            vm.ok = function() {
                deployNavigation.navigate('queue');
            };
        }
    ]);
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.FlowController',
    [
        function () {
            var vm = this;
        }
    ]);
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.ProgressController',
    [
        '$scope', 'deployConfiguration', 'deployService', 'deployQueueService', 'deployNavigation',
        function($scope, deployConfiguration, deployService, deployQueueService, deployNavigation) {
            var vm = this;

            vm.progress = 0;

            vm.updateProgress = function(percent) {
                vm.progress = percent;
            };

            vm.deployConfiguration = deployConfiguration;

            $scope.$on('deploy:sessionUpdated',
                function(event, sessionUpdatedArgs) {
                    
                    // make sure the event is for us
                    if (sessionUpdatedArgs.sessionId === deployService.sessionId) {
                        vm.progress = sessionUpdatedArgs.percent;
                        if (sessionUpdatedArgs.status === 3) { // Completed
                            deployNavigation.navigate('done-deploy');
                            deployQueueService.clearQueue();
                            deployService.removeSessionId();
                        } else if (sessionUpdatedArgs.status === 4) { // Failed
                            deployService.error = {
                                comment: sessionUpdatedArgs.comment,
                                log: sessionUpdatedArgs.log,
                                status: sessionUpdatedArgs.status
                            };
                            deployNavigation.navigate('error');
                        } else if (sessionUpdatedArgs.status === 5) { // Cancelled
                            deployService.error = {
                                comment: sessionUpdatedArgs.comment,
                                log: sessionUpdatedArgs.log,
                                status: sessionUpdatedArgs.status
                            };
                            deployNavigation.navigate('error');
                        } else if (sessionUpdatedArgs.status === 6) { // Timed out
                            deployService.error = {
                                comment: sessionUpdatedArgs.comment,
                                log: sessionUpdatedArgs.log,
                                status: sessionUpdatedArgs.status
                            };
                            deployNavigation.navigate('error');
                        }
                        else {
                            _.defer(function() { $scope.$apply(); });
                        }
                    }
                    
                });

            deployService.getStatus();
        }
    ]);
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.QueueController',
    [
        'deployConfiguration', 'deployQueueService', 'deploySignalrService', 'deployService',
        function(deployConfiguration, deployQueueService, deploySignalrService, deployService) {
            var vm = this;

            vm.deployConfiguration = deployConfiguration;

            vm.limitToItemAmount = 2;
            vm.showExpandLink = false;

            vm.items = deployQueueService.queue;

            vm.startDeploy = function() {
                deployService.deploy(vm.items);
            };

            vm.clearQueue = function() {
                deployQueueService.clearQueue();
            };

            vm.removeFromQueue = function (item) {
                deployQueueService.removeFromQueue(item);
            };

            vm.refreshQueue = function() {
                deployQueueService.refreshQueue();
            };

            vm.restore = function() {
                deployService.restore();
            };
        }
    ]);
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.RestoreController',
    [
        '$scope', 'deployService', 'deployConfiguration',
        function ($scope, deployService, deployConfiguration) {

            var vm = this;

            vm.restore = function () {
                deployService.restore(deployConfiguration.Target.DeployUrl);
            };
        }
    ]);
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.WorkspaceInfoController',
        function() {
            var vm = this;
        });