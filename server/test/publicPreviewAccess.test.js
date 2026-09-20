import test from 'node:test';
import assert from 'node:assert/strict';
import { canPreviewPublicFile, fileMatchesFolderPath } from '../controllers/fileController.js';

test('public preview access allows a file marked public without an authenticated user', () => {
  const file = {
    visibility: 'public',
    user: 'owner-123'
  };

  const req = {};
  assert.equal(canPreviewPublicFile(req, file), true);
});

test('public preview access blocks private files even when a request has no auth user', () => {
  const file = {
    visibility: 'private',
    user: 'owner-123'
  };

  const req = {};
  assert.equal(canPreviewPublicFile(req, file), false);
});

test('folder path helper matches files that belong to the selected folder path', () => {
  assert.equal(fileMatchesFolderPath('project/notes.txt', 'project'), true);
  assert.equal(fileMatchesFolderPath('project/sub/a.txt', 'project'), true);
  assert.equal(fileMatchesFolderPath('other/a.txt', 'project'), false);
});
