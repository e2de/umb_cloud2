(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udConnectLocal', udConnectLocalComponent);

    function udConnectLocalComponent() {

        function link(scope, element, attr, ctrl) {

            scope.connectionOptions = [
                {
                    'name': 'Use Visual Studio',
                    'detailsAlias': 'vs',
                    'icon': 'icon-infinity'
                },
                {
                    'name': 'Use Grunt or Gulp',
                    'detailsAlias': 'cli',
                    'icon': 'icon-terminal'
                },
                {
                    'name': 'Connect with git',
                    'detailsAlias': 'git',
                    'icon': 'icon-forms-github'
                }
            ];
            
            scope.visibleConnectionDetail = '';


            scope.showConnectionDetails = function(type) {
                scope.visibleConnectionDetail = type;
            };

        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/udconnectlocal/udconnectlocal.html',
            scope: {
                'gitUrl': "@",
            },
            link: link
        };

        return directive;

    }

})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udContentFlow', udContentflowComponent);

    function udContentflowComponent(workspaceHelper, angularHelper, deployQueueService, deployService, deployConfiguration, deploySignalrService, deployHelper) {

        function link(scope, element, attr, ctrl) {

            scope.config = deployConfiguration;

            function onInit() {

                // make local collection of workspaces because we will have to add "local" and "add workspace".
                scope.dashboardWorkspaces = angular.copy(scope.config.Workspaces);

                // reset the deploy progress
                scope.resetDeploy();

                // add "Add workspace"
                workspaceHelper.addAddWorkspace(scope.dashboardWorkspaces);

                // set active workspace
                setCurrentWorkspace(scope.dashboardWorkspaces);
            }

            // signalR events for deploy progress
            scope.$on('deploy:sessionUpdated', function (event, args) {
                
                // make sure the event is for us
                if (args.sessionId === deployService.sessionId) {
                    angularHelper.safeApply(scope, function () {

                        scope.deploy.deployProgress = args.percent;
                        scope.deploy.currentActivity = args.comment;
                        scope.deploy.status = deployHelper.getStatusValue(args.status);

                        if (scope.deploy.status === 'completed') {
                            
                            deployQueueService.clearQueue();
                            deployService.removeSessionId();
                        
                        } else if (scope.deploy.status === 'failed' || scope.deploy.status === 'cancelled' || scope.deploy.status === 'timedOut') { 
                            
                            scope.deploy.error = {
                                hasError: true,
                                comment: args.comment,
                                log: args.log,
                                exception: args.exception
                            };

                        }

                    });
                }

            });

            function setCurrentWorkspace(workspaces) {
                angular.forEach(workspaces, function (workspace) {
                    if (workspace.Type === scope.config.CurrentWorkspaceType) {
                        workspace.Current = true;
                        workspace.Active = true;
                        scope.showWorkspaceInfo(workspace);
                    }
                });
            }

            scope.resetDeploy = function() {
                scope.deploy = {
                    'deployProgress': 0,
                    'currentActivity': '',
                    'status': '',
                    'error': {}
                };
            };

            scope.selectWorkspace = function(selectedWorkspace, workspaces) {

                // deselect all workspaces
                if(workspaces) {
                    angular.forEach(workspaces, function(workspace){
                        workspace.Active = false;
                    });
                }

                // deselect local workspace
                if(scope.localWorkspace) {
                    scope.localWorkspace.Active = false;
                }
                
                // select workspace
                if(selectedWorkspace) {
                    selectedWorkspace.Active = true;
                }

                scope.showWorkspaceInfo(selectedWorkspace);

            };

            scope.showWorkspaceInfo = function (workspace) {

                if (workspace.Type === 'inactive') {
                    scope.workspaceInfobox = 'addWorkspace';
                } else if (workspace.Type === 'local' && !workspace.Current) {
                    scope.workspaceInfobox = 'connect';
                }
                else if (workspace.Current && scope.config.Target) {
                    scope.workspaceInfobox = 'deploy';
                }
                else {
                    scope.workspaceInfobox = 'info';
                }

            };

            scope.getActiveWorkspace = function() {
                return workspaceHelper.getActiveWorkspace(scope.dashboardWorkspaces);
            };

            scope.addWorkspaceInPortal = function (projectUrl) {
                workspaceHelper.addWorkspaceInPortal(projectUrl);
            };

            onInit();
        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/udcontentflow/udcontentflow.html',
            link: link
        };
        return directive;
    }
})();

(function() {
    'use strict';
    
    angular
        .module('umbraco.deploy.components')
        .directive('udError', udErrorComponent);

    function udErrorComponent() {
        function link(scope, element, attr, ctrl) {

            scope.errorDetailsVisible = false;
            scope.toggleErrorDetails = function() {
                scope.errorDetailsVisible = !scope.errorDetailsVisible;
            }

            // fetch the inner exception that actually makes sense to show in the UI.
            // AggregateException and RemoteApiException are completely non-saying about what the problem is
            // so we should try to get the inner exception instead and use that for displaying errors.
            scope.uiException = scope.exception;
            while ((scope.uiException.ClassName === 'System.AggregateException' ||
                    scope.uiException.ClassName === 'Umbraco.Deploy.Exceptions.RemoteApiException' ||
                    scope.uiException.ClassName === 'System.Net.Http.HttpRequestException') &&
                scope.uiException.InnerException !== null) {
                scope.uiException = scope.uiException.InnerException;
            }
        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/uderror/uderror.html',
            scope: {
                'exception': "=",
                'comment': "=",
                'log': "=",
                'status': "=",
                'onBack': "&",
                'noNodes': '='
            },
            link: link
        };
        return directive;
    }
})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udInfobox', udInfoboxComponent);

    function udInfoboxComponent() {

        function link(scope, element, attr, ctrl) {
            
        }

        var directive = {
            restrict: 'E',
            transclude: true,
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/udinfobox/udinfobox.html',
            link: link
        };

        return directive;

    }

})();

(function () {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udStarterKitSelector', udStarterKitSelectorComponent);

    function udStarterKitSelectorComponent($compile, packageResource) {

        function link(scope, el, attr, ctrl) {

            scope.installStarterKit = false;
            scope.installStatus = "";
            scope.starterkitName = "";

            scope.selectStarterKit = function (starterKitName) {
                scope.starterkitName = starterKitName;
            };

            scope.startInstall = function () {
                var starterKitName = scope.starterkitName;

                if (starterKitName !== "blank") {
                    installStarterKit(starterKitName);
                } else {

                    if (scope.onSelectStarterKit) {
                        scope.onSelectStarterKit(starterKitName);
                    }

                }
            };

            function installStarterKit(starterKitName) {

                scope.installStarterKit = true;
                scope.installStatus = "Downloading starterkit...";
                scope.installProgress = "10";
                scope.starterkitName = starterKitName;

                packageResource
                    .fetch(starterKitName)
                    .then(function (pack) {
                        scope.installStatus = "Importing starterkit...";
                        scope.installProgress = "30";
                        return packageResource.import(pack);
                    }, installError)
                    .then(function (pack) {
                        scope.installStatus = "Installing starterkit...";
                        scope.installProgress = "60";
                        return packageResource.installFiles(pack);
                    }, installError)
                    .then(function (pack) {
                        scope.installStatus = "Restarting, please hold...";
                        scope.installProgress = "90";
                        return packageResource.installData(pack);
                    }, installError)
                    .then(function (pack) {
                        scope.installStatus = "All done, your browser will now refresh";
                        scope.installProgress = "100";
                        return packageResource.cleanUp(pack);
                    }, installError)
                    .then(installComplete, installError);
            }

            function installComplete(result) {
                if (scope.onSelectStarterKit) {
                    scope.onSelectStarterKit(scope.starterkitName);
                }
            };

            function installError(err){
                scope.installStatus = undefined;
                scope.installError = err;
            };

            // hack: move element to body to make it full-screen
            // we cannot make an element full screen because of overflow hidden on content
            if (attr.hasOwnProperty("show")) {
                scope.$watch("show", function(value) {
                    if (value === true) {
                        el.appendTo("body");
						$compile(el)(scope);
                    } else {
                        el.remove();
                    }
                });
            }

        }

        var directive = {
            restrict: 'E',
            transclude: true,
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/udstarterkitselector/udstarterkitselector.html',
            link: link,
            scope: {
                onSelectStarterKit: "=",
                show: "="
            }
        };

        return directive;

    }

})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udDeployComplete', udDeployCompleteComponent);

    function udDeployCompleteComponent() {
        function link(scope, element, attr, ctrl) {
        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/deploy/uddeploycomplete/uddeploycomplete.html',
            scope: {
                'targetName': "=",
                'targetUrl': "=",
                'onBack': "&"
            },
            link: link
        };
        return directive;
    }
})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udDeployProgress', udDeployProgressComponent);

    function udDeployProgressComponent() {
        function link(scope, element, attr, ctrl) {
        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/deploy/uddeployprogress/uddeployprogress.html',
            scope: {
                'targetName': "=",
                'progress': "=",
                'currentActivity': "="
            },
            link: link
        };
        return directive;
    }
})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udDeployQueue', udDeployQueueComponent);

    function udDeployQueueComponent(deployQueueService, deployService) {
        function link(scope, element, attr, ctrl) {

            var eventBindings = [];            
            scope.items = deployQueueService.queue;

            scope.buttonState = 'init';

            scope.startDeploy = function () {

                //Disable the button so you can't click it loads of times
                scope.buttonState = 'busy';

                deployService.deploy().then(function(data) {

                    //Update UI instantly to in-progress
                    //Rather than trigger a WebAPI that will send out a SignalR event, sometimes this can be slow
                    //And look like the UI is not doing anything


                    //Update the parent scope as this component nested in ud-content-flow
                    //And display the ud-deploy-progress component
                    //Then when signalR kicks in & pushes out an event the UI will be ready
                    scope.$parent.deploy.status = 'inProgress';

                    //Button is success (We most likely not see this state as the above will trigger the view change)
                    scope.buttonState = 'success';

                }, function (error) {

                    //Catching the 500 error from the request made to the UI/API Controller to trigger an instant deployment
                    //Other errors will be caught in 'deploy:sessionUpdated' event pushed out

                    //We don't have ClassName in our Exception here but ExceptionType is what we have
                    //Push in the value manually into our error/exception object
                    error['ClassName'] = error.ExceptionType;

                    //Parent Scope (As this is nested inside ud-content-flow)
                    scope.$parent.deploy.status = 'failed';
                    scope.$parent.deploy.error = {
                        hasError: true,
                        comment: error.Message,
                        exception: error
                    };

                    //Set button state to error (We most likely not see this state as the above will trigger the error view change)
                    scope.buttonState = 'error';

                });

            };

            scope.clearQueue = function () {
                deployQueueService.clearQueue();
            };

            scope.removeFromQueue = function (item) {
                deployQueueService.removeFromQueue(item);
            };

            scope.refreshQueue = function () {
                deployQueueService.refreshQueue();
            };

            scope.toggleEntityTypeItems = function(items) {
                items.showItems = !items.showItems;
            };

            function setIncludeDescendantsText(items) {
                angular.forEach(items, function(item){
                    if(item.IncludeDescendants) {
                        item.IncludeDescendantsText = "Including all items below it";
                    }
                });
            }
            
            eventBindings.push(scope.$watch('items', function(newValue, oldValue){
                setIncludeDescendantsText(scope.items);
            }, true));

            // clean up
            scope.$on('$destroy', function () {
                // unbind watchers
                for (var e in eventBindings) {
                    eventBindings[e]();
                }
            });

        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/deploy/uddeployqueue/uddeployqueue.html',
            scope: {
                targetName: "=",
                targetUrl: "="
            },
            link: link
        };
        return directive;
    }
})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udBusyError', udBusyErrorComponent);

    function udBusyErrorComponent() {
        function link(scope, element, attr, ctrl) {
            
        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/errors/udbusyerror/udbusyerror.html',
            scope: {
                'exception': "="
            },
            link: link
        };
        return directive;
    }
})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udCollisionError', udCollisionErrorComponent);

    function udCollisionErrorComponent() {
        function link(scope, element, attr, ctrl) {
            scope.errorDetailsVisible = false;
            scope.toggleErrorDetails = function() {
                scope.errorDetailsVisible = !scope.errorDetailsVisible;
            }
        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/errors/udcollisionerror/udcollisionerror.html',
            scope: {
                'exception': "="
            },
            link: link
        };
        return directive;
    }
})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udContentTypeChangedError', udContentTypeChangedErrorComponent);

    function udContentTypeChangedErrorComponent() {
        function link(scope, element, attr, ctrl) {
        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/errors/udcontenttypechangederror/udcontenttypechangederror.html',
            scope: {
                'exception': "="
            },
            link: link
        };
        return directive;
    }
})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udDeploySchemaMismatchError', udDeploySchemaMismatchErrorComponent);

    function udDeploySchemaMismatchErrorComponent() {
        function link(scope, element, attr, ctrl) {
            scope.errorDetailsVisible = false;
            scope.toggleErrorDetails = function() {
                scope.errorDetailsVisible = !scope.errorDetailsVisible;
            }
        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/errors/uddeployschemamismatcherror/uddeployschemamismatcherror.html',
            scope: {
                'exception': "="
            },
            link: link
        };
        return directive;
    }
})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udKabumError', udKabumErrorComponent);

    function udKabumErrorComponent() {
        function link(scope, element, attr, ctrl) {
            scope.errorDetailsVisible = false;
            scope.toggleErrorDetails = function() {
                scope.errorDetailsVisible = !scope.errorDetailsVisible;
            }
        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/errors/udkabumerror/udkabumerror.html',
            scope: {
                'exception': "="
            },
            link: link
        };
        return directive;
    }
})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udRestoreSchemaMismatchError', udRestoreSchemaMismatchErrorComponent);

    function udRestoreSchemaMismatchErrorComponent() {
        function link(scope, element, attr, ctrl) {
            scope.errorDetailsVisible = false;
            scope.toggleErrorDetails = function() {
                scope.errorDetailsVisible = !scope.errorDetailsVisible;
            }
        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/errors/udrestoreschemamismatcherror/udrestoreschemamismatcherror.html',
            scope: {
                'exception': "=",
                'noNodes': '='
            },
            link: link
        };
        return directive;
    }
})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udUnauthorizedClientError', udUnauthorizedClientErrorComponent);

    function udUnauthorizedClientErrorComponent() {
        function link(scope, element, attr, ctrl) {
            scope.errorDetailsVisible = false;
            scope.toggleErrorDetails = function() {
                scope.errorDetailsVisible = !scope.errorDetailsVisible;
            }
        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/errors/udunauthorizedclienterror/udunauthorizedclienterror.html',
            scope: {
                'exception': "="
            },
            link: link
        };
        return directive;
    }
})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udWebExceptionError', udWebExceptionErrorComponent);

    function udWebExceptionErrorComponent() {
        function link(scope, element, attr, ctrl) {
        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/errors/udwebexceptionerror/udwebexceptionerror.html',
            scope: {
                'exception': "="
            },
            link: link
        };
        return directive;
    }
})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udRestoreComplete', udRestoreCompleteComponent);

    function udRestoreCompleteComponent() {

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/restore/udrestorecomplete/udrestorecomplete.html',
            scope: {
                'onBack': "&"
            }
        };

        return directive;

    }

})();
(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udRestoreProgress', udRestoreProgressComponent);

    function udRestoreProgressComponent() {

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/restore/udrestoreprogress/udrestoreprogress.html',
            scope: {
                'targetName': "=",
                'progress': "=",
                'currentActivity': "="
            }
        };

        return directive;

    }

})();
(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udWorkspace', udWorkspaceComponent);

    function udWorkspaceComponent() {

        function link(scope, element, attr, ctrl) {


        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/workspace/udworkspace/udworkspace.html',
            scope: {
                'name': '=',
                'type': '=',
                'current': '=',
                'active': '=',
                'deployProgress': "=",
                'showDetailsArrow': "=",
                'onClick': '&'
            },
            link: link
        };

        return directive;

    }

})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udWorkspaceAdd', udWorkspaceAddComponent);

    function udWorkspaceAddComponent() {

        function link(scope, element, attr, ctrl) {
            

        }

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/workspace/udworkspaceadd/udworkspaceadd.html',
            scope: {
                'onAddWorkspace': '&'
            },
            link: link
        };

        return directive;

    }

})();

(function() {
    'use strict';

    angular
        .module('umbraco.deploy.components')
        .directive('udWorkspaceInfo', udWorkspaceInfoComponent);

    function udWorkspaceInfoComponent() {

        var directive = {
            restrict: 'E',
            replace: true,
            templateUrl: '/App_Plugins/Deploy/views/components/workspace/udworkspaceinfo/udworkspaceinfo.html',
            scope: {
                'websiteUrl': "@",
                'umbracoUrl': "@",
                'projectUrl': "@",
                'projectName': "@"
            }
        };

        return directive;

    }

})();
