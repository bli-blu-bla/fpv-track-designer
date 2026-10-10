/// <reference path="../pb_data/types.d.ts" />

// Coarse validation for synced tracks and collection entries, plus label/namespace consistency.
// Runs on every create/update (API and dashboard).

onRecordValidate((e) => {
  const { checkName, checkTrackData } = require(`${__hooks}/lib/validation.js`)

  let data = null
  try {
    data = JSON.parse(e.record.getString('data'))
  } catch (_) {
    throw new BadRequestError('data must be valid JSON')
  }

  const problem = checkName(e.record.getString('name')) || checkTrackData(data)
  if (problem) throw new BadRequestError(problem)

  e.next()
}, 'tracks', 'entries')

onRecordValidate((e) => {
  const entryId = e.record.getString('entry')
  let entry
  try {
    entry = e.app.findRecordById('entries', entryId)
  } catch (_) {
    throw new BadRequestError('label entry does not exist')
  }

  if (entry.getString('namespace') !== e.record.getString('namespace')) {
    throw new BadRequestError('label entry belongs to another namespace')
  }

  e.next()
}, 'labels')
