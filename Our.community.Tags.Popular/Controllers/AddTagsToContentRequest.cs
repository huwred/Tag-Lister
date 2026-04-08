namespace Our.community.Tags.Popular.Controllers
{
    public class AddTagsToContentRequest
    {
        /// <summary>GUID key of the content or media node.</summary>
        public string ContentKey { get; set; } = string.Empty;

        /// <summary>Alias of the Tags property on the node to add the tags to.</summary>
        public string TagPropertyAlias { get; set; } = string.Empty;

        /// <summary>Tag group that the property belongs to.</summary>
        public string Group { get; set; } = string.Empty;

        /// <summary>Tag texts to add.</summary>
        public List<string> Tags { get; set; } = new();
    }
}
