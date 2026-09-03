import assert from "assert";
import { runMigrations } from "../migrate.js";
import {
  getAllCustomRoles,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  createAnnouncement,
  getRecentAnnouncements,
} from "../db.js";

async function main() {
  await runMigrations();

  const id = `rtest_${Date.now().toString(36)}`;
  // Ensure id not present
  const before = getAllCustomRoles();
  if (before.find((r) => r.id === id)) {
    deleteCustomRole(id);
  }

  // Create
  createCustomRole({ id, name: "Integration Test Role", description: "Created by test" });
  let roles = getAllCustomRoles();
  const created = roles.find((r) => r.id === id);
  assert(created, "Role was not created");
  assert.strictEqual(created!.name, "Integration Test Role");

  // Update
  updateCustomRole(id, { name: "Integration Role Updated", description: "Updated by test" });
  roles = getAllCustomRoles();
  const updated = roles.find((r) => r.id === id);
  assert(updated, "Role not found after update");
  assert.strictEqual(updated!.name, "Integration Role Updated");

  // Delete
  deleteCustomRole(id);
  roles = getAllCustomRoles();
  const deleted = roles.find((r) => r.id === id);
  assert(!deleted, "Role still present after delete");

  const announcementId = `ann_${Date.now().toString(36)}`;
  createAnnouncement({
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

  const announcements = getRecentAnnouncements();
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
