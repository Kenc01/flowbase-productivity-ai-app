import { Router, type IRouter } from "express";
import healthRouter from "./health";
import kanbanRouter from "./kanban";
import calendarRouter from "./calendar";
import notesRouter from "./notes";
import pagesRouter from "./pages";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/kanban", kanbanRouter);
router.use("/calendar", calendarRouter);
router.use("/notes", notesRouter);
router.use("/pages", pagesRouter);

export default router;
