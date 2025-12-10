# feat(ui): add personalized greeting in header (Good <TimeOfDay>, <Name>)

## Description

This PR adds a personalized greeting component to the app header that displays:
- "Good Morning/Afternoon/Evening/Night" based on local system time
- User's name (displayName or email) when logged in
- Generic greeting when user is anonymous
- Appropriate emoji for time of day (🌅 ☀️ 🌆 🌙)

The greeting updates immediately when the user logs in/out or switches accounts without requiring a page reload.

## Files Changed

- `src/components/Greeting.tsx` - New Greeting component
- `src/App.tsx` - Added Greeting component to main layout
- `src/__tests__/greeting.test.js` - Unit tests for Greeting component
- `src/__tests__/Greeting.integration.test.js` - Integration tests for Greeting component

## Implementation Details

- Uses AuthContext to access current user information
- Time of day updates automatically every 15 minutes
- Accessible with proper aria-live and role attributes
- Responsive design that works with collapsed sidebar
- Fallback to email username when displayName is not available

## How to Test

1. Start app logged-out → header shows "Good <TimeOfDay>!"
2. Log in as user A (displayName set) → header updates to "Good <TimeOfDay>, <A> <emoji>" immediately
3. Switch account or logout → greeting updates accordingly without reload
4. Verify time updates every 15 minutes (can be tested by changing system time)
5. Check accessibility with screen reader (aria-live should announce changes)

## Accessibility

- Header uses `role="banner"` and `aria-live="polite"` so screen readers announce greeting when it changes
- Proper contrast and sizing for readability
- No keyboard interaction required (display only component)

## QA Checklist

- [ ] Start app logged-out → header shows Good <TimeOfDay>!
- [ ] Log in as user A (displayName set) → header updates to Good <TimeOfDay>, <A> 🌅 immediately
- [ ] Switch account or logout → greeting updates accordingly without reload
- [ ] Keyboard/Screen reader: ensure aria-live announces change
- [ ] Time updates every 15 minutes (test by changing system time)
- [ ] Works with collapsed sidebar
- [ ] No console errors

## Manual Testing Instructions

1. Open the application
2. Verify the greeting appears at the top of the main content area
3. Check that the time of day is correct for your local time
4. Log in with a user account that has a displayName
5. Verify the greeting updates to include your name
6. Log out and verify the greeting returns to the anonymous version
7. Test with a user account that only has an email (no displayName)
8. Verify the email username is used as the name