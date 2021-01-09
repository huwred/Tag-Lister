angular.module("umbraco.resources").factory("TagListResource", function ($http) {
    return {
        getTagsByGroup: function (groupName,maxTags) {
            return $http.get("backoffice/Api/CommonTagList/GetTags/?group=" + groupName + "&max=" + maxTags);
        },
        addTags: function (selectedTags,contentid,tagproperty,groupname) {
            
            var tagdata = {
                "id": contentid,
                "group": groupname,
                "propertyId": tagproperty,
                "tags": selectedTags
            }
            return $http.post("backoffice/Api/CommonTagList/AddTags", angular.toJson(tagdata));
        }
    };
});