import createClient from "openapi-fetch";
import type { paths } from "./schema";

const API_URL = "https://api-statbotics.iterativerefinement.com";

export const Statbotics = createClient<paths>({ baseUrl: API_URL });
