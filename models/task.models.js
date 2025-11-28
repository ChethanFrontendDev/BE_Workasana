const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  }, // Refers to Project model
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true }, // Refers to Team model
  owners: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Refers to User model (owners)
  ],
  tags: [
    // { type: String },
    { type: mongoose.Schema.Types.ObjectId, ref: "Tag", required: true },
  ],
  dueDate: {
    type: Date,
    required: true,
  },
  timeToComplete: { type: Number, required: true },
  status: {
    type: String,
    enum: ["To Do", "In Progress", "Completed", "Blocked"],
    default: "To Do",
  }, // Task status
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
// Automatically update the `updatedAt` field whenever the document is updated
taskSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});
module.exports = mongoose.model("Task", taskSchema);
