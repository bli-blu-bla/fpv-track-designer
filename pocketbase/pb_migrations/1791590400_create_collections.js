/// <reference path="../pb_data/types.d.ts" />

// Initial schema: personal tracks (sync), namespaces + entries + labels (collections), anonymous shares.
// Rules are PocketBase filter expressions; `null` locks an API action to superusers only.

const MEMBER_RULE = '@request.auth.id != "" && namespace.members.id ?= @request.auth.id'
const KEEP_NAMESPACE = '(@request.body.namespace:isset = false || @request.body.namespace = namespace)'
const MAX_TRACK_JSON_BYTES = 262144
const THUMBNAIL_FIELD = {
  name: 'thumbnail',
  type: 'file',
  maxSelect: 1,
  maxSize: 204800,
  mimeTypes: ['image/jpeg'],
}

migrate((app) => {
  const users = app.findCollectionByNameOrId('users')

  const tracks = new Collection({
    type: 'base',
    name: 'tracks',
    listRule: 'owner = @request.auth.id',
    viewRule: 'owner = @request.auth.id',
    createRule: '@request.auth.id != "" && @request.body.owner = @request.auth.id',
    updateRule: 'owner = @request.auth.id && (@request.body.owner:isset = false || @request.body.owner = @request.auth.id)',
    deleteRule: 'owner = @request.auth.id',
    fields: [
      { name: 'owner', type: 'relation', required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { name: 'clientId', type: 'text', required: true, max: 64 },
      { name: 'name', type: 'text', required: true, max: 120 },
      { name: 'data', type: 'json', required: true, maxSize: MAX_TRACK_JSON_BYTES },
      THUMBNAIL_FIELD,
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_tracks_owner_client ON tracks (owner, clientId)'],
  })
  app.save(tracks)

  const namespaces = new Collection({
    type: 'base',
    name: 'namespaces',
    listRule: '',
    viewRule: '',
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: 'slug', type: 'text', required: true, pattern: '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' },
      { name: 'name', type: 'text', required: true, max: 120 },
      { name: 'members', type: 'relation', collectionId: users.id, maxSelect: 999 },
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_namespaces_slug ON namespaces (slug)'],
  })
  app.save(namespaces)

  const entries = new Collection({
    type: 'base',
    name: 'entries',
    listRule: '',
    viewRule: '',
    createRule: `${MEMBER_RULE} && @request.body.createdBy = @request.auth.id`,
    updateRule: `${MEMBER_RULE} && ${KEEP_NAMESPACE} && @request.body.createdBy:isset = false`,
    deleteRule: MEMBER_RULE,
    fields: [
      { name: 'namespace', type: 'relation', required: true, collectionId: namespaces.id, maxSelect: 1, cascadeDelete: true },
      { name: 'name', type: 'text', required: true, max: 120 },
      { name: 'data', type: 'json', required: true, maxSize: MAX_TRACK_JSON_BYTES },
      THUMBNAIL_FIELD,
      { name: 'eventDate', type: 'date' },
      { name: 'createdBy', type: 'relation', collectionId: users.id, maxSelect: 1 },
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE INDEX idx_entries_namespace ON entries (namespace)'],
  })
  app.save(entries)

  const labels = new Collection({
    type: 'base',
    name: 'labels',
    listRule: '',
    viewRule: '',
    createRule: MEMBER_RULE,
    updateRule: `${MEMBER_RULE} && ${KEEP_NAMESPACE}`,
    deleteRule: MEMBER_RULE,
    fields: [
      { name: 'namespace', type: 'relation', required: true, collectionId: namespaces.id, maxSelect: 1, cascadeDelete: true },
      { name: 'name', type: 'text', required: true, pattern: '^[a-z0-9][a-z0-9._-]{0,63}$' },
      { name: 'entry', type: 'relation', required: true, collectionId: entries.id, maxSelect: 1, cascadeDelete: true },
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_labels_namespace_name ON labels (namespace, name)',
      'CREATE INDEX idx_labels_entry ON labels (entry)',
    ],
  })
  app.save(labels)

  // Only reachable through the custom routes in pb_hooks/shares.pb.js; all standard API actions stay locked.
  const shares = new Collection({
    type: 'base',
    name: 'shares',
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      {
        name: 'id',
        type: 'text',
        system: true,
        primaryKey: true,
        required: true,
        min: 8,
        max: 8,
        pattern: '^[a-z0-9]{8}$',
        autogeneratePattern: '[a-z0-9]{8}',
      },
      { name: 'payload', type: 'text', required: true, max: 16384 },
      { name: 'hash', type: 'text', required: true, max: 64 },
      { name: 'lastAccessedAt', type: 'date', required: true },
      { name: 'created', type: 'autodate', onCreate: true },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_shares_hash ON shares (hash)',
      'CREATE INDEX idx_shares_last_accessed ON shares (lastAccessedAt)',
    ],
  })
  app.save(shares)
}, (app) => {
  for (const name of ['shares', 'labels', 'entries', 'namespaces', 'tracks']) {
    app.delete(app.findCollectionByNameOrId(name))
  }
})
