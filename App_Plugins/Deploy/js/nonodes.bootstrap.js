(function () {
    "use strict";
    function NoNodesController($scope, $http, $timeout, $q, deploySignalrService, deployHelper) {
        var vm = this;
        var baseUrl = Umbraco.Sys.ServerVariables.umbracoUrls.deployNoNodesBaseUrl;

        vm.restore = {};
        vm.logIsvisible = false;
        vm.restoreData = restoreData;
        vm.restoreSchema = restoreSchema;
        vm.showLog = showLog;        
        vm.isDebug = Umbraco.Sys.ServerVariables.deploy.DebugEnabled;
        vm.requiresInitialization = vm.isDebug;

        function restoreSchema() {
            //reset the status to begin
            vm.restore.status = "";
            vm.restore.restoreMessage = "Initializing your website...";
            $http.post(baseUrl + 'CreateDiskReadTrigger')
                .then(function (response) {});
        }

        /**
         * When this loads we need to check for markers. Either the initialization or failed markers may be present
         * in which case we'll create a deploy marker to start the deployment process.
         */
        function checkInitMarker() {
            
            var deferred = $q.defer();
            
            $http.get(baseUrl + 'CheckMarkers')
                .then(function (response) {
                    if (Umbraco.Sys.ServerVariables.deploy.DebugEnabled) {
                        vm.requiresInitialization = true;
                    }
                    else {
                        //If OK is returned, that means 
                        vm.restore.status = "ready";    
                    }
                    deferred.resolve();
                }, function (response) {
                    if (response.status === 417) {
                        //If a 417 is returned it means we need to initialize
                        vm.requiresInitialization = true;
                    }
                    deferred.resolve();
                });

            return deferred.promise;
        }

        function restoreData() {
            var data = {
                SourceUrl: Umbraco.Sys.ServerVariables.deploy.Target.Url
            };
            return $http.post(baseUrl + 'Restore', data)
                .then(function (response) {
                    vm.step = "restoreWebsite";
                },
                function (response) {

                    vm.restore.status = "failed";

                    vm.restore = {
                        'error': {
                            hasError: true,
                            exceptionMessage: response.data.ExceptionMessage,
                            log: response.data.StackTrace,
                            exception: response.data.Exception
                        }
                    };
                });
        };

        function showLog() {
            vm.logIsvisible = true;
        }

        function init() {
            vm.restore = {
                'restoreMessage': "Restoring your website...",
                'restoreProgress': 0,
                'currentActivity': '',
                'status': '',
                'error': {}
            };

            if (!vm.isDebug) {
                $timeout(function () {
                    checkInitMarker().then(function () {
                        //if we are not in debug just start
                        if (!vm.isDebug) {
                            restoreSchema();
                        }
                    });
                }, 1000);
            }
        }        

        function updateRestoreArgs(event, args) {
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
        }

        //listen for the restore data
        $scope.$on('restore:sessionUpdated',
            function (event, args) {
                $scope.$apply(function () {
                    updateRestoreArgs(event, args);
                });
            });

        //listen for the schema data to complete - this deployments starts as soon as this view loads
        //once that is done we'll present the Restore step
        $scope.$on('restore:diskReadSessionUpdated',
            function (event, args) {
                $scope.$apply(function () {
                    updateRestoreArgs(event, args);

                    //when this is done, show the restore step
                    if (vm.restore.status === "completed") {
                        vm.restore.status = "ready";
                        vm.restore.restoreMessage = "Restoring your website...";
                    }
                });
            });

        init();
    }
    angular.module("umbraco.nonodes").controller("Umbraco.NoNodes.Controller", NoNodesController);
})();