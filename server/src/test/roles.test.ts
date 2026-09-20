import assert from "assert";
import { runMigrations } from "../migrate.js";
import {
  getAllCustomRoles,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  createAnnouncement,
  getRecentAnnouncements,
  getDatabaseMode,
} from "../db.js";

async function main() {
  assert(["sqlite", "postgres"].includes(getDatabaseMode()), "Unsupported database mode");
  await runMigrations();

  const id = `rtest_${Date.now().toString(36)}`;
  // Ensure id not present
  const before = await getAllCustomRoles();
  if (before.find((r) => r.id === id)) {
    await deleteCustomRole(id);
  }

  // Create
  await createCustomRole({ id, name: "Integration Test Role", description: "Created by test" });
  let roles = await getAllCustomRoles();
  const created = roles.find((r) => r.id === id);
  assert(created, "Role was not created");
  assert.strictEqual(created!.name, "Integration Test Role");

  // Update
  await updateCustomRole(id, { name: "Integration Role Updated", description: "Updated by test" });
  roles = await getAllCustomRoles();
  const updated = roles.find((r) => r.id === id);
  assert(updated, "Role not found after update");
  assert.strictEqual(updated!.name, "Integration Role Updated");

  // Delete
  await deleteCustomRole(id);
  roles = await getAllCustomRoles();
  const deleted = roles.find((r) => r.id === id);
  assert(!deleted, "Role still present after delete");

  const announcementId = `ann_${Date.now().toString(36)}`;
  await createAnnouncement({
    id: announcementId,
    title: "Quarterly system update",
    message: "All teams should review the change log.",
    priority: "important",
    audienceType: "all",
    audienceJson: JSON.stringify(["admin@company.com"]),
    attachmentData: "data:application/pdf;base64,JVBERi0xLjQK",
    attachmentName: "Quarterly System Update.pdf",
    scheduledAt: null,
    createdBy: "admin@company.com",
  });

  const announcements = await getRecentAnnouncements();
  const createdAnnouncement = announcements.find((a) => a.id === announcementId);
  assert(createdAnnouncement, "Announcement was not created");
  assert.strictEqual(createdAnnouncement!.title, "Quarterly system update");
  assert.strictEqual(createdAnnouncement!.attachmentData, "data:application/pdf;base64,JVBERi0xLjQK");
  assert.strictEqual(createdAnnouncement!.attachmentName, "Quarterly System Update.pdf");

  console.log("roles.test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
