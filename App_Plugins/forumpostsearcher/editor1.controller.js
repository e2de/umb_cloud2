angular.module("umbraco")
    .controller("forumpost.editorcontroller", function($scope, $http){
        
        $scope.search = function(term){
            if(term && term.length > 4){
                var url = "https://our.umbraco.org/umbraco/api/OurSearch/GetForumSearchResults=?term="+term;

                $http.get(url).then(function(response){
                    //getting the json results and saving into model results
                    $scope.model.results = response.data.items;
                });
    
            }else {
                $scope.model.results = ["Enter a query"];
            }

//            $scope.model.results = ["you", "searched", "for", term];
        }

    });