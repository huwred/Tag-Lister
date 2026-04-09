# Our.community.Tags.Popular

A **custom property editor for Umbraco 17** that displays the most-used tags in a named group and lets editors multi-select them to populate a sibling **Tags** property on the same content or media node — all without leaving the editing screen.

![Common Tags property editor](https://raw.githubusercontent.com/huwred/Tag-Lister/refs/heads/main/assets/propertypicker.webp)

---

## What it does

The **Common Tags** property editor solves a common editorial problem: Umbraco's built-in Tags property only lets editors type tag names freehand. There is no browser of existing tags in the same group to pick from. This package adds that missing picker.

When added to a Document Type alongside a standard Tags property it will:

1. **Fetch all tags** in the configured group, sorted by usage count (most-tagged nodes first).
2. **Display them as a checkbox list** so editors can multi-select any combination.
3. On **"Add to list"**, append the selected tags to the sibling Tags property and save/republish the node automatically.

Tags are loaded via a direct query against Umbraco's `cmsTags` and `cmsTagRelationship` tables so the list always reflects the live tag state, including up-to-date usage counts.

---

## Requirements

| Requirement | Version |
|---|---|
| Umbraco CMS | 17.x (net10.0) |
| .NET SDK | 10.0+ |

---

## Installation

### .NET CLI

```bash
dotnet add package Our.community.Tags.Popular
```

### Package Manager Console

```powershell
Install-Package Our.community.Tags.Popular
```

### PackageReference

```xml
<PackageReference Include="Our.community.Tags.Popular" Version="x.x.x" />
```

That's all that's needed. The compiled backoffice JavaScript is bundled inside the NuGet package and served as a static web asset. Umbraco discovers the property editor automatically via the `umbraco-package.json` included in the package — no `Startup.cs` changes or manual asset build steps are required.

> The `OurcommunityTagsPopularApiComposer` runs automatically on startup and registers the backoffice API and its Swagger document.

---

## Setting up the Data Type

1. In the Umbraco backoffice go to **Settings → Data Types → Create**.
2. Select **Common Tags** as the property editor.
3. Configure the three settings:

| Setting | Required | Description |
|---|---|---|
| **Tag Control** | **Required** | Alias of the Tags property on the same Document Type that will receive the selected tags (e.g. `tags`). Also used to auto-detect the tag group from that property's Data Type configuration when **Group Override** is not set. |
| **Number of Tags** | Optional | Maximum number of tags to show in the picker list. Defaults to **10**. |
| **Group Override** | Optional | Hard-code the tag group name used to fetch and display tags (e.g. `keywords`). When set, the group is no longer auto-detected from the **Tag Control** property — but **Tag Control** is still required to identify the recipient Tags property. |

> **Tip:** *Tag Control* is always required — it tells the editor which Tags property to write the selected tags into. *Group Override* is an optional shortcut that fixes the source group for the picker list, bypassing auto-detection from the Tag Control's Data Type configuration.

![Common Tags property editor](https://raw.githubusercontent.com/huwred/Tag-Lister/refs/heads/main/assets/propertypickerconfig.webp)

---

## Adding the property editor to a Document Type

1. Open the Document Type in **Settings → Document Types**.
2. Add a new property and select your **Common Tags** Data Type.
3. Add a second property using the standard **Tags** Data Type (this is the property that stores the actual tags). Set its alias to whatever you entered in **Tag Control** above.
4. Save and re-open a content node of that type.

The Common Tags picker appears directly on the content editing screen. Editors check the tags they want, then press **Add to list**. The Tags property is updated and the node is saved. If the node was already published it is republished automatically.

![Common Tags property editor](https://raw.githubusercontent.com/huwred/Tag-Lister/refs/heads/main/assets/commontags.webp)

---

## How group resolution works

```
Tag Control alias (always required)
  └─ identifies the recipient Tags property
  └─ groupOverride set?
       └─ YES → use that group name to load the picker list
       └─ NO  → look up the Tags Data Type for the Tag Control property
                  └─ read the "Group" field from its configuration
                       └─ use that group name to load the picker list
```

**Tag Control** is always required — it determines which property receives the selected tags. **Group Override** only changes where the picker list of available tags comes from; it does not remove the need for a recipient property alias.

This means a single Common Tags Data Type can serve multiple Document Types without needing a separate Data Type per content type — as long as each Document Type's Tags property is configured with the correct group.

---

## API reference

The package registers a versioned backoffice API at:

```
/umbraco/ourcommunitytagspopular/api/v1/
```

All endpoints require a valid Umbraco backoffice session and the **Content** section access policy.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `tagsingroup/{groupName}` | Returns all tags in the given group sorted by usage count descending. |
| `GET` | `groupforalias?contentKey={guid}&propertyAlias={alias}` | Returns the tag group name configured on a Tags property. |
| `POST` | `addtagstocontent` | Appends selected tag texts to a content or media node's Tags property and saves (and republishes if published). |
| `GET` | `ping` | Health-check — returns `"Pong"`. |

### `GET tagsingroup/{groupName}` response

```json
[
  { "id": 1, "tag": "umbraco", "group": "keywords", "noTaggedNodes": 14 },
  { "id": 2, "tag": "cms",     "group": "keywords", "noTaggedNodes":  9 }
]
```

### `POST addtagstocontent` request body

```json
{
  "contentKey":       "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  "tagPropertyAlias": "tags",
  "group":            "keywords",
  "tags":             ["umbraco", "cms"]
}
```

### Swagger UI

The full API is browseable at:

```
/umbraco/swagger/index.html
```

Select **Ourcommunity Tags Popular Backoffice API** from the document picker in the top-right corner.

---

## Development workflow

### Watch mode

Run `npm run dev` in the `Client` folder to start Vite's file watcher. Output is still written to `wwwroot` so the Umbraco site picks up changes on page reload.

### Project structure

```
Our.community.Tags.Popular/
├── Client/
│   ├── src/
│   │   ├── property-editor/
│   │   │   ├── taglist-property-editor-ui.element.ts   # Lit Element – the picker UI
│   │   │   ├── taglist-repository.ts                   # Fetch wrapper for the backoffice API
│   │   │   └── manifest.ts                             # Registers the propertyEditorUi extension
│   │   ├── api/
│   │   │   └── types.ts                                # CmsTag and related TypeScript types
│   │   └── bundle.manifests.ts                         # Top-level manifest bundle
│   ├── public/
│   │   └── umbraco-package.json                        # Umbraco package descriptor
│   └── vite.config.ts
├── Controllers/
│   ├── OurcommunityTagsPopularApiControllerBase.cs     # Route + auth base class
│   ├── OurcommunityTagsPopularApiController.cs         # Tag API endpoints
│   └── AddTagsToContentRequest.cs                      # POST request model
├── Composers/
│   └── OurcommunityTagsPopularApiComposer.cs           # DI and Swagger registration
├── Constants.cs
└── Our.community.Tags.Popular.csproj
```

---

## Notes

- **Media nodes are supported.** `addtagstocontent` and `groupforalias` check content first, then fall back to media. This means the property editor works on media Document Types as well.
- **Tags are stored as JSON.** `SetUpdatedTagValue` serialises the tag list as a JSON array (`["tag1","tag2"]`) to match the format Umbraco's Tags property editor expects. Writing a plain CSV string corrupts the value.
- **The picker has no persistent value of its own.** It uses `Umbraco.Plain.Json` as its property editor schema so a valid empty value is stored. All meaningful data lives on the sibling Tags property.
- **Re-publish on save.** When `addtagstocontent` saves a content node that is already published it calls `IContentService.Publish` immediately, so the front-end tag queries reflect the change without a manual publish step.
