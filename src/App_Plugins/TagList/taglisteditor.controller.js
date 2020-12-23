﻿angular.module("umbraco")
    .controller("TagListController",
        function ($scope,TagListResource,$routeParams,contentResource,notificationsService,$window) {

            var vm = this;
            vm.loading = true;
            vm.cmsTags = {};
            vm.selected = {};
            vm.routeid = $routeParams.id;
            vm.tagPropertyId = -1;
            vm.groupName = "";
            
            contentResource.getById($routeParams.id)
                .then((data) => {
                    angular.forEach(data.variants[0].tabs[1].properties, (property) => {
                        if (property.view === "tags") {
                            vm.tagPropertyId = property.id;
                            vm.groupName = property.config.group;
                            TagListResource.getTagsByGroup(vm.groupName).then(function (response) {
                                vm.cmsTags = response.data;
                            });
                        }
                        vm.loading = false;
                    });
                },function(response) {
                    // this will run for status 4xx, 5xx, etc..
                    if (response.status === 404) {
                        //stop the backend throwing 404 in settings section
                        notificationsService.remove(0);
                        return null;
                    }

                }).catch(function(err) {
                    console.log(err);
                });

            $scope.addTags = function (selectedTags) {
                vm.loading = true;
                TagListResource.addTags(selectedTags,$routeParams.id).then(function (response) {
                    //would be better to relod the tags here rather than the whole pag :(
                    $window.location.reload();

                });
            };
        });