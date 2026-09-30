import { App, redirect } from "@elements/app";
import config from "#config";
import home from "#app/pages/home";
import signin from "#app/pages/signin";
import signup from "#app/pages/signup";
import projects from "#app/pages/projects";
import issues from "#app/pages/issues";
import issue from "#app/pages/issue";
import settings from "#app/pages/settings";
import tryPage from "#app/pages/try";
import notFound from "#app/pages/errors/not-found";
import unhandled from "#app/pages/errors/unhandled";
import ingest from "#app/api/ingest";
import sdk from "#app/api/sdk";

const app = new App();

app.route("/", home);
app.route("/signin", signin);
app.route("/signup", signup);
app.route("/projects", projects);
app.route("/projects/:projectId", issues);
app.route("/projects/:projectId/issues/:issueId", issue);
app.route("/projects/:projectId/settings", settings);
app.route("/try/:projectId", tryPage);
app.route("/api/events", ingest);
app.route("/sdk.js", sdk);

app.error((req, res, err) => {
  switch (err.statusCode) {
    case 401:
      if (req.method === "GET") {
        redirect("/signin");
        return;
      }

      return unhandled(req, res, err);

    case 404:
      return notFound(req, res, err);

    default:
      return unhandled(req, res, err);
  }
});

app.start(config);
