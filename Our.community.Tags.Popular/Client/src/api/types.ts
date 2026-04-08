export interface CmsTag {
	id: number;
	tag: string;
	group: string;
	noTaggedNodes: number;
	taggedDocuments: TaggedDocument[];
	taggedMedia: TaggedMedia[];
	tagsInGroup: TagInGroup;
	// Support both camelCase and PascalCase from API
	Id?: number;
	Tag?: string;
	Group?: string;
	NoTaggedNodes?: number;
	TaggedDocuments?: TaggedDocument[];
	TaggedMedia?: TaggedMedia[];
	TagsInGroup?: TagInGroup;
}

export interface TagGroup {
	group: string;
	Group?: string;
}

export interface TagInGroup {
	selectedItem: PlainPair;
	options: PlainPair[];
	// Support PascalCase from API
	SelectedItem?: PlainPair;
	Options?: PlainPair[];
}

export interface PlainPair {
	id: number;
	tag: string;
	// Support PascalCase from API
	Id?: number;
	Tag?: string;
}

export interface TaggedDocument {
	documentId: number;
	documentName: string;
	documentUrl: string;
	// Support PascalCase from API
	DocumentId?: number;
	DocumentName?: string;
	DocumentUrl?: string;
}

export interface TaggedMedia {
	documentId: number;
	documentName: string;
	documentUrl: string;
	// Support PascalCase from API
	DocumentId?: number;
	DocumentName?: string;
	DocumentUrl?: string;
}

