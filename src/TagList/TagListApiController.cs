using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using CommonTagList.Models;
using Umbraco.Core.Models;
using Umbraco.Core.Services;
using Umbraco.Web;
using Umbraco.Web.Models;
using Umbraco.Web.WebApi;

namespace CommonTagList.Controllers
{
    public class CommonTagListController : UmbracoAuthorizedApiController
    {
        private ITagQuery _tagQuery;

        public CommonTagListController(ITagQuery tagQuery)
        {
            _tagQuery = tagQuery;
        }
        [HttpGet]
        public IEnumerable<TagModel> GetTags(string group, int max)
        {
            return _tagQuery.GetAllTags(group).OrderByDescending(t=>t.NodeCount).Take(max);
        }

        [HttpPost]
        public IContent AddTags(SelectedTag Tags)
        {
            IContentService ss = Services.ContentService;
            var content = ss.GetById(Tags.Id);
            var group = Tags.Group;
            //get the Tag property on the page
            var tagproperty = content.Properties.SingleOrDefault(p => p.PropertyType.PropertyEditorAlias == "Umbraco.Tags" && p.Id == Tags.PropertyId);

            var taggedContent = _tagQuery.GetTagsForProperty(Tags.Id,tagproperty.Alias).Select(t=>t.Text).ToArray();

            string[] newTagsToSet = Tags.Tags.Select(t=>t.Text).ToArray();

            //make content persisted 
            Services.ContentService.Save(content);
            // set the tags
            content.AssignTags(tagproperty.Alias, newTagsToSet.Union(taggedContent).ToArray());
            Services.ContentService.SaveAndPublish(content);

            return content; //tags.OrderByDescending(t=>t.NodeCount).Take(10);
        }
    }
}