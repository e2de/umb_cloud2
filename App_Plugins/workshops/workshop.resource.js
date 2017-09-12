angular.module("umbraco.resources")
	.factory("workshopResource", function($http){

	var myService = {};	
	
	
	myService.getAll = function(){
	    return $http.get("Backoffice/Workshop/WorkshopApi/getAll");
	};

	myService.search = function(name){
	    return $http.get("Backoffice/Workshop/WorkshopApi/getByName?name=" +
	name);
	};


	myService.getById = function(id){
	    return $http.get("Backoffice/Workshop/WorkshopApi/GetById?id=" + id);
	};

	myService.save = function(workshop){
	    return $http.post("Backoffice/Workshop/WorkshopApi/PostSave", workshop);
	};

	myService.delete = function(id){
	    return $http.delete("Backoffice/Workshop/WorkshopApi/DeleteById?id=" + id);
	};


	return myService;
});
