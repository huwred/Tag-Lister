angular.module("umbraco")
    .controller("TagListController",
        function ($scope,TagListResource,$routeParams,contentResource,notificationsService,$window) {

            var vm = this;
            vm.loading = true;
            vm.cmsTags = {};
            vm.selected = {};
            vm.routeid = $routeParams.id;
            vm.tagPropertyId = -1;
            vm.groupName = $scope.group;

            vm.commonTags = [];
            //$scope.cmsTags = {};group
            console.log($scope.model.config.tagParent);
            contentResource.getById($routeParams.id)
                .then((data) => {
                    angular.forEach(data.variants[0].tabs, (tab) => {
                        
                        angular.forEach(tab.properties, (property) => {
                            if (property.alias === $scope.model.config.tagParent) {
                                vm.tagPropertyId = property.id;
                                if (vm.groupName === "") {
                                    vm.groupName = property.config.group;
                                    
                                }
                                console.log(tab);
                                console.log('grp: ' + property.config.group);
                                $scope.group = property.config.group;
                                var limit = parseInt($scope.model.config.maxTags);
                                TagListResource.getTagsByGroup(property.config.group, limit).then(function (response) {
                                    console.log(response.data);
                                    vm.cmsTags = response.data;
                                    //$scope.cmsTags = response.data;
                                    var taggroup = {
                                        "group":$scope.group,
                                        "tags": vm.cmsTags
                                    }
                                    vm.commonTags.push(taggroup);
                                });


                            }
                            
                        });

                        //console.log(vm.cmsTags);
                        //console.log($scope.cmsTags);
                    });
                    vm.loading = false;


                },function(response) {
                    // this will run for status 4xx, 5xx, etc..
                    if (response.status === 404) {
                        //stop the backend throwing 404 in settings section
                        notificationsService.remove(0);
                        vm.loading = false;
                        return null;
                    }

                }).catch(function(err) {
                    console.log('err: ' + err);
                    vm.loading = false;
                });

            $scope.addTags = function (selectedTags) {
                vm.loading = true;
                TagListResource.addTags(selectedTags,$routeParams.id,vm.tagPropertyId, vm.groupName).then(function (response) {
                    //would be better to relod the tags here rather than the whole pag :(
                    $window.location.reload();

                });
            };


        });