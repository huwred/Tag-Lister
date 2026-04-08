export const manifests: Array<UmbExtensionManifest> = [
	{
		type: 'propertyEditorUi',
		alias: 'TagList.PropertyEditorUi.TagList',
		name: 'Common Tags',
		elementName: 'taglist-property-editor-ui',
		js: () => import('./taglist-property-editor-ui.element.js'),
		meta: {
			label: 'Common Tags',
			icon: 'icon-tags',
			group: 'pickers',
			// JSON schema is safe because the editor uses a side-effect model (no own persistent value).
			propertyEditorSchemaAlias: 'Umbraco.Plain.Json',
			settings: {
				properties: [
					{
						alias: 'tagParent',
						label: 'Tag Control',
						description: 'Alias of the Tags property on this content type whose list will receive the selected tags.',
						propertyEditorUiAlias: 'Umb.PropertyEditorUi.TextBox',
					},
					{
						alias: 'maxTags',
						label: 'Number of Tags',
						description: 'Maximum number of tags to display in the picker list.',
						propertyEditorUiAlias: 'Umb.PropertyEditorUi.Integer',
					},
					{
						alias: 'groupOverride',
						label: 'Group Override',
						description: 'Tag group to load. Leave blank to auto-detect the group from the Tag Control property.',
						propertyEditorUiAlias: 'Umb.PropertyEditorUi.TextBox',
					},
				],
				defaultData: [{ alias: 'maxTags', value: 10 }],
			},
		},
	},
];