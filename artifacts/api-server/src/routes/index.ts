import { Router, type IRouter } from "express";
import healthRouter from "./health";
import kanbanRouter from "./kanban";
import calendarRouter from "./calendar";
import notesRouter from "./notes";
import pagesRouter from "./pages";
import spacesRouter from "./spaces";
import collaboratorsRouter from "./collaborators";
import liveblocksRouter from "./liveblocks";
import aiRefineRouter from "./ai-refine";
import assemblyaiRouter from "./assemblyai";
import whiteboardsRouter from "./whiteboards";
import aiDiagramRouter from "./ai-diagram";
import aiTemplatesRouter from "./ai-templates";
import settingsRouter from "./settings";
import aiAssistantRouter from "./ai-assistant";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/kanban", kanbanRouter);
router.use("/calendar", calendarRouter);
router.use("/notes", notesRouter);
router.use("/pages", pagesRouter);
router.use("/spaces", spacesRouter);
router.use("/collaborators", collaboratorsRouter);
router.use("/liveblocks", liveblocksRouter);
router.use("/ai-refine", aiRefineRouter);
router.use("/assemblyai", assemblyaiRouter);
router.use("/whiteboards", whiteboardsRouter);
router.use("/ai-diagram", aiDiagramRouter);
router.use("/ai-templates", aiTemplatesRouter);
router.use("/settings", settingsRouter);
router.use("/ai-assistant", aiAssistantRouter);
router.use("/notifications", notificationsRouter);

export default router;

