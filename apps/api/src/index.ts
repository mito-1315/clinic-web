import "dotenv/config";
const { createApp } = await import("./app");
const { startReminderScheduler } = await import("./notify");

const port = Number(process.env.PORT ?? 4000);
createApp().listen(port, () => console.log(`API on :${port}  docs: /api/docs`));
startReminderScheduler();
