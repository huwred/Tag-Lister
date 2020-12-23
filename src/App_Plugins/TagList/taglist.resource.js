angular.module("umbraco.resources").factory("TagListResource", function ($http) {
    return {
        getTagsByGroup: function (groupName) {
            return $http.get("backoffice/Api/CommonTagList/GetTags/?group=" + groupName);
        },
        addTags: function (selectedTags,propertyid) {
            var tagdata = {
                "id": propertyid,
                "tags": selectedTags
            }
            return $http.post("backoffice/Api/CommonTagList/AddTags", angular.toJson(tagdata));
        }
    };
});