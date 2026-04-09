using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NPoco;
using System.Text.Json;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Scoping;

namespace Our.community.Tags.Popular.Controllers
{
    [ApiVersion("1.0")]
    [ApiExplorerSettings(GroupName = "Our.community.Tags.Popular")]
    public class OurcommunityTagsPopularApiController : OurcommunityTagsPopularApiControllerBase
    {
        private readonly IScopeProvider _scopeProvider;
        private readonly ILogger<OurcommunityTagsPopularApiController> _logger;
        private readonly IMediaService _mediaService;
        private readonly IContentService _contentService;
        private readonly ITagService _tagService;
        private readonly IJsonSerializer _jsonSerializer;
        private readonly IDataTypeService _dataTypeService;

        public OurcommunityTagsPopularApiController(
            IScopeProvider scopeProvider,
            ILogger<OurcommunityTagsPopularApiController> logger,
            IMediaService mediaService,
            IContentService contentService,
            ITagService tagService,
            IJsonSerializer jsonSerializer,
            IDataTypeService dataTypeService)
        {
            _scopeProvider = scopeProvider ?? throw new ArgumentNullException(nameof(scopeProvider));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _mediaService = mediaService ?? throw new ArgumentNullException(nameof(mediaService));
            _contentService = contentService ?? throw new ArgumentNullException(nameof(contentService));
            _tagService = tagService ?? throw new ArgumentNullException(nameof(tagService));
            _jsonSerializer = jsonSerializer ?? throw new ArgumentNullException(nameof(jsonSerializer));
            _dataTypeService = dataTypeService ?? throw new ArgumentNullException(nameof(dataTypeService));
        }

        [HttpGet("ping")]
        [ProducesResponseType<string>(StatusCodes.Status200OK)]
        public string Ping() => "Pong";

        /// <summary>
        /// Returns all tags within a named group, including relationship counts.
        /// </summary>
        [HttpGet("tagsingroup/{groupName}")]
        public IActionResult GetTagsInGroup(string groupName)
        {
            if (string.IsNullOrWhiteSpace(groupName))
                return BadRequest("Group name is required.");

            try
            {
                using var scope = _scopeProvider.CreateScope();

                var query = new Sql(
                    "SELECT id, tag, [group], COUNT(tagId) AS noTaggedNodes " +
                    "FROM cmsTags " +
                    "LEFT JOIN cmsTagRelationship ON cmsTags.id = cmsTagRelationship.tagId " +
                    "WHERE [group] = @0 " +
                    "GROUP BY tag, id, [group] " +
                    "ORDER BY COUNT(tagId) DESC, tag",
                    groupName);

                var tags = scope.Database.Fetch<dynamic>(query);

                scope.Complete();
                return Ok(tags);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving tags for group '{GroupName}'", groupName);
                return StatusCode(500, "An error occurred while retrieving tags.");
            }
        }

        /// <summary>
        /// Returns the tag group configured on a specific property of a content or media node.
        /// Used by the TagList property editor to resolve the group from a sibling Tags property alias.
        /// </summary>
        [HttpGet("groupforalias")]
        public async Task<IActionResult> GetGroupForAlias([FromQuery] string contentKey, [FromQuery] string propertyAlias)
        {
            if (!Guid.TryParse(contentKey, out var key))
                return BadRequest("A valid content key (GUID) is required.");

            if (string.IsNullOrWhiteSpace(propertyAlias))
                return BadRequest("Property alias is required.");

            try
            {
                IContent? content = _contentService.GetById(key);
                if (content != null)
                {
                    var prop = content.Properties.FirstOrDefault(p =>
                        string.Equals(p.PropertyType.Alias, propertyAlias, StringComparison.OrdinalIgnoreCase));

                    if (prop != null)
                    {
                        var group = await GetTagPropertyGroup(prop);
                        if (group != null)
                            return Ok(new { group });
                    }
                }

                // Fall back to checking media nodes.
                IMedia? media = _mediaService.GetById(key);
                if (media != null)
                {
                    var prop = media.Properties.FirstOrDefault(p =>
                        string.Equals(p.PropertyType.Alias, propertyAlias, StringComparison.OrdinalIgnoreCase));

                    if (prop != null)
                    {
                        var group = await GetTagPropertyGroup(prop);
                        if (group != null)
                            return Ok(new { group });
                    }
                }

                return NotFound($"Could not determine tag group for property '{propertyAlias}'.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resolving group for alias '{Alias}' on '{Key}'", propertyAlias, contentKey);
                return BadRequest($"Error: {ex.Message}");
            }
        }

        /// <summary>
        /// Adds a set of tag texts to a content or media node's Tags property and saves the node.
        /// Used by the TagList property editor "Add to list" button.
        /// </summary>
        [HttpPost("addtagstocontent")]
        public IActionResult AddTagsToContent([FromBody] AddTagsToContentRequest request)
        {
            if (request == null)
                return BadRequest("Request payload is required.");

            if (!Guid.TryParse(request.ContentKey, out var key))
                return BadRequest("A valid content key (GUID) is required.");

            if (string.IsNullOrWhiteSpace(request.TagPropertyAlias))
                return BadRequest("Tag property alias is required.");

            if (string.IsNullOrWhiteSpace(request.Group))
                return BadRequest("Tag group is required.");

            if (request.Tags == null || request.Tags.Count == 0)
                return BadRequest("At least one tag is required.");

            try
            {
                // Try content first, then media.
                IContent? content = _contentService.GetById(key);
                if (content != null)
                {
                    var property = content.Properties.FirstOrDefault(p =>
                        string.Equals(p.PropertyType.Alias, request.TagPropertyAlias, StringComparison.OrdinalIgnoreCase));

                    if (property == null)
                        return NotFound($"Property '{request.TagPropertyAlias}' was not found on the content node.");

                    var currentTags = GetCurrentTagTexts(content.Id, request.Group);
                    bool changed = false;
                    foreach (var tag in request.Tags)
                    {
                        if (!currentTags.Contains(tag, StringComparer.OrdinalIgnoreCase))
                        {
                            currentTags.Add(tag);
                            changed = true;
                        }
                    }

                    if (!changed)
                        return Ok(0);

                    SetUpdatedTagValue(property, currentTags);
                    var saveResult = _contentService.Save(content);
                    if (!saveResult.Success)
                        return StatusCode(500, "Failed to save content.");

                    //if (content.Published)
                    //    _contentService.Publish(content, []);

                    return Ok(currentTags.Count);
                }

                IMedia? media = _mediaService.GetById(key);
                if (media != null)
                {
                    var property = media.Properties.FirstOrDefault(p =>
                        string.Equals(p.PropertyType.Alias, request.TagPropertyAlias, StringComparison.OrdinalIgnoreCase));

                    if (property == null)
                        return NotFound($"Property '{request.TagPropertyAlias}' was not found on the media node.");

                    var currentTags = GetCurrentTagTexts(media.Id, request.Group);
                    bool changed = false;
                    foreach (var tag in request.Tags)
                    {
                        if (!currentTags.Contains(tag, StringComparer.OrdinalIgnoreCase))
                        {
                            currentTags.Add(tag);
                            changed = true;
                        }
                    }

                    if (!changed)
                        return Ok(0);

                    SetUpdatedTagValue(property, currentTags);
                    _mediaService.Save(media);
                    return Ok(currentTags.Count);
                }

                return NotFound($"No content or media found with key '{request.ContentKey}'.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding tags to content key '{Key}'", request.ContentKey);
                return BadRequest($"Error adding tags: {ex.Message}");
            }
        }


        // -----------------------------------------------------------------------
        // Private helpers
        // -----------------------------------------------------------------------

        /// <summary>Reads the "group" field from a Tags data type configuration object.</summary>
        private static string ReadGroupFromConfiguration(object? configuration)
        {
            const string fallback = "default";
            if (configuration is null) return fallback;

            try
            {
                var bytes = JsonSerializer.SerializeToUtf8Bytes(configuration);
                using var doc = JsonDocument.Parse(bytes);
                if (doc.RootElement.TryGetProperty("group", out var groupEl))
                    return groupEl.GetString() ?? fallback;
            }
            catch
            {
                // Return default if configuration cannot be inspected.
            }

            return fallback;
        }
        /// <summary>
        /// Returns the group name stored in the DataType configuration for a Tags property,
        /// or <c>null</c> if the property is not a Tags property or the group cannot be determined.
        /// </summary>
        private async Task<string?> GetTagPropertyGroup(IProperty property)
        {
            try
            {
                var dataType = await _dataTypeService.GetAsync(property.PropertyType.DataTypeKey);
                // Umbraco v14+ uses ConfigurationObject; earlier versions used Configuration.
                var config = dataType?.ConfigurationObject;
                if (config == null) return null;
                // Access Group via reflection so this works across Umbraco versions without
                // a hard dependency on the concrete TagConfiguration class.
                return config.GetType()
                    .GetProperty("Group")
                    ?.GetValue(config) as string;
            }
            catch
            {
                return null;
            }
        }
        /// <summary>
        /// Returns the current tag texts for a given entity and group.
        /// Fetched once per entity and shared across all property iterations.
        /// </summary>
        private List<string> GetCurrentTagTexts(int entityId, string group)
        {
            return _tagService
                .GetTagsForEntity(entityId, group)
                ?.Select(t => t.Text)
                .ToList()
                ?? new List<string>();
        }

        /// <summary>
        /// Sets the updated value on a tag property.
        ///
        /// Strategy:
        ///   - If the old name is known and present in the stored string, do a targeted replace
        ///     (preserves ordering and avoids a full rewrite).
        ///   - Otherwise fall back to writing the full current tag list from the database,
        ///     which is the authoritative source of truth.
        /// </summary>
        private void SetUpdatedTagValue(
            IProperty property,
            List<string> currentTags)
        {
            // Tags / TagsPicker store JSON arrays; CSV corrupts the value and clears tags in the UI.
            property.SetValue(
                currentTags.Count > 0 ? _jsonSerializer.Serialize(currentTags) : string.Empty);
        }
    }
}
