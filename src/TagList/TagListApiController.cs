using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using CommonTagList.Models;
using Umbraco.Core.Models;
using Umbraco.Core.Services;
using Umbraco.Web.Models;
using Umbraco.Web.WebApi;

namespace CommonTagList.Controllers
{
    public class CommonTagListController : UmbracoAuthorizedApiController
    {
        [HttpGet]
        public IEnumerable<TagModel> GetTags(string group)
        {
            var selecttags = new List<SelectedTag>();
            var tags = Umbraco.TagQuery.GetAllTags(group);
            return tags.OrderByDescending(t=>t.NodeCount).Take(10);
        }

        [HttpPost]
        public IContent AddTags(SelectedTag Tags)
        {
            IContentService ss = Services.ContentService;
            var content = ss.GetById(Tags.Id);
            var tagproperty = content.Properties.SingleOrDefault(p => p.PropertyType.PropertyEditorAlias == "Umbraco.Tags");

            var taggedContent = Umbraco.TagQuery.GetTagsForProperty(Tags.Id,tagproperty.Alias).Select(t=>t.Text).ToArray();

            string[] newTagsToSet = Tags.Tags.Select(t=>t.Text).ToArray();

            //make content persisted animals.Union(taggedContent).ToArray()
            Services.ContentService.Save(content);
            // set the tags
            content.AssignTags(tagproperty.Alias, newTagsToSet.Union(taggedContent).ToArray());
            Services.ContentService.SaveAndPublish(content);


            var tags = Umbraco.TagQuery.GetAllTags();
            return content; //tags.OrderByDescending(t=>t.NodeCount).Take(10);
        }
    }
}