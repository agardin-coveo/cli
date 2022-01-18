import {cli} from 'cli-ux';
import {buildEvent} from '../../hooks/analytics/eventUtils';

/**
 *
 * @param message confirmation prompt (yes/no)
 * @param questionName Used for analytics purposes to name the action. Should not contain sensitive information.
 * See https://coveord.atlassian.net/wiki/spaces/RD/pages/2214168207/Amplitude for taxonomy
 * @returns
 */
export async function confirmWithAnalytics(
  message: string,
  questionName: string
): Promise<boolean> {
  const doAction = await cli.confirm(message);
  if (doAction) {
    trackEvent(`confirmed ${questionName}`);
    return true;
  } else {
    trackEvent(`cancelled ${questionName}`);
    return false;
  }
}

async function trackEvent(questionName: string) {
  await config.runHook('analytics', {
    event: buildEvent(questionName, {}),
  });
}