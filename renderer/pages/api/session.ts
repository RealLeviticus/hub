import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "../../lib/session";
import { NextApiRequest, NextApiResponse } from "next";
import type { VatACARSUserData } from "../../lib/types";

export default async function userRoute(req: NextApiRequest, res: NextApiResponse<VatACARSUserData | {}>) {
    const session = await getIronSession<SessionData>(req, res, sessionOptions);

    if (session.user) {
        res.json(session.user);
    } else {
        res.json({});
    }
}