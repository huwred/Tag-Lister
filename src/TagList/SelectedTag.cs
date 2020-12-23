using System.Collections.Generic;
using Umbraco.Web.Models;

namespace CommonTagList.Models
{
    public class SelectedTag
    {
        public int Id { get; set; }
        public IEnumerable<TagModel> Tags;
    }
}