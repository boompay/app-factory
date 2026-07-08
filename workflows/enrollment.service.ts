import { ApiClient } from "../services";
import { AppInfo, Email } from "../models";
import { randomFullName, createTestInbox } from "../helpers";

export async function enrollApplication(
  api: ApiClient,
  app: AppInfo,
  applicationToken: string
): Promise<{
  enrollResponse: unknown;
  user: ReturnType<typeof randomFullName>;
  email: Email;
}> {
  const user = randomFullName();
  const email = await createTestInbox();

  const enrollResponseRaw = await api.enrollWithMagicLink({
    magic_link_token: applicationToken,
    unit_id: app.unit_id,
    applicant: {
      email: email.email,
      first_name: user.first,
      last_name: user.last,
      middle_name: user.middle,
    },
  });

  const enrollResponse = await enrollResponseRaw.json();

  app.id = enrollResponse.application.id;
  if (!app.applicants) {
    app.applicants = [];
  }
  if (app.applicants.length === 0) {
    app.applicants.unshift({});
  }
  app.applicants[0].id = enrollResponse.application.current_applicant.id;
  app.applicants[0]!.email = email;
  app.applicants[0]!.first_name = user.first;
  app.applicants[0]!.last_name = user.last;
  app.applicants[0]!.middle_name = user.middle;

  return { enrollResponse, user, email };
}
