import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attendanceGuidance,
  isTraineeType,
  personLabel,
  requiresCourse,
} from './trainee.ts';

test('isTraineeType matches case and surrounding whitespace', () => {
  assert.equal(isTraineeType('Trainee'), true);
  assert.equal(isTraineeType('  trainee '), true);
  assert.equal(isTraineeType('Trainer'), false);
  assert.equal(isTraineeType(null), false);
});

test('requiresCourse covers trainees and trainers only', () => {
  assert.equal(requiresCourse('Trainee'), true);
  assert.equal(requiresCourse('TRAINER'), true);
  assert.equal(requiresCourse('VIP'), false);
  assert.equal(requiresCourse(''), false);
});

test('personLabel preserves a real label and falls back to Guest', () => {
  assert.equal(personLabel('Trainee'), 'Trainee');
  assert.equal(personLabel('  Trainer  '), 'Trainer');
  assert.equal(personLabel(null), 'Guest');
  assert.equal(personLabel('   '), 'Guest');
});

test('attendanceGuidance points at the entrance before check-in', () => {
  const guidance = attendanceGuidance({ checkedIn: false });
  assert.match(guidance.body, /entrance/i);
  assert.doesNotMatch(guidance.body, /room door/i);
});

test('attendanceGuidance names the room only when one is known', () => {
  const inRoom = attendanceGuidance({
    checkedIn: true,
    roomLabel: 'Room 304',
  });
  assert.match(inRoom.body, /Room 304/);

  const inLobby = attendanceGuidance({ checkedIn: true });
  assert.doesNotMatch(inLobby.body, /recorded in/i);
  assert.match(inLobby.body, /room door/i);
});
