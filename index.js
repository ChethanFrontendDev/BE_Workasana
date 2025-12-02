const { initializeDatabse } = require("./db/db.connect");
const Admin = require("./models/admin.models");
const Project = require("./models/project.models");
const Team = require("./models/team.models");
const Tag = require("./models/tag.models");
const User = require("./models/user.models");
const Task = require("./models/task.models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");
const express = require("express");
const app = express();

// const cors = require("cors");
const corsOptions = {
  origin: "*",
  credentials: true,
};
app.use(cors(corsOptions));

app.use(express.json());

initializeDatabse();

const JWT_SECRET = "your_jwt_secret";

// Register new user
async function registerAdmin(username, email, password) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new Admin({
      name: username,
      email: email,
      password: hashedPassword,
    });

    const saveNewUser = await newUser.save();
    return saveNewUser;
  } catch (error) {
    throw error;
  }
}
app.post("/auth/signup", async (req, res) => {
  const { username, email, password } = req.body;

  const isUserExist = await Admin.findOne({ name: username });
  const isEmailExist = await Admin.findOne({ email: email });
  if (isUserExist) {
    return res.status(400).json({ message: "Username already exists." });
  }
  if (isEmailExist) {
    return res.status(400).json({ message: "Email already exists." });
  }

  try {
    const savedUser = await registerAdmin(username, email, password);
    return res
      .status(201)
      .json({ message: "User added successfully", admin: savedUser });
  } catch (error) {
    res.status(500).json({ error: "Failed to add new user." });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email: email });

    if (!admin) {
      return res.status(404).json({ message: "Email does not exist." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password." });
    }

    const token = jwt.sign({ role: "admin" }, JWT_SECRET, {
      expiresIn: "24hr",
    });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Server Error." });
  }
});

// Verify token
const verifyJWT = (req, res, next) => {
  const authToken = req.headers["authorization"];

  if (!authToken) {
    return res.status(401).json({ message: "No token provided" });
  }

  const [type, token] = authToken.split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Invalid authorization format" });
  }

  try {
    const decodedToken = jwt.verify(token, JWT_SECRET);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(500).json({ message: "Invalid token." });
  }
};

// Protect all these routes
// app.use(["/auth/me", "/projects", "/teams", "/tags"], verifyJWT);

// Protected Route
app.get("/auth/me", verifyJWT, (req, res) => {
  res.json({
    message: "Protected route accessed.",
    user: req.user,
  });
});

// Project
async function createProject(projectDetails) {
  try {
    const addNewProject = new Project(projectDetails);
    const saveNewProject = await addNewProject.save();
    return saveNewProject;
  } catch (error) {
    throw error;
  }
}
app.post("/projects", async (req, res) => {
  try {
    const savedProject = await createProject(req.body);

    if (savedProject) {
      return res.status(201).json({
        message: "Project created successfully.",
        project: savedProject,
      });
    }
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }

    if (error.name === "ValidationError") {
      const field = Object.keys(error.errors)[0];
      const message = error.errors[field].message;

      return res.status(400).json({
        error: `Invalid Input: '${field}' is required.`,
        details: message,
      });
    }

    res.status(500).json({ error: "Failed to add project." });
  }
});

async function readAllProjects() {
  try {
    const readProjects = await Project.find();
    return readProjects;
  } catch (error) {
    throw error;
  }
}
app.get("/projects", verifyJWT, async (req, res) => {
  try {
    const readProjects = await readAllProjects();

    if (readProjects.length !== 0) {
      res.json(readProjects);
    } else {
      res.status(404).json({ error: "Project not found." });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects." });
  }
});

// DELETE Project
async function deleteProjectById(id) {
  try {
    const deleteProject = await Project.findByIdAndDelete(id);
    return deleteProject;
  } catch (error) {
    throw error;
  }
}
app.delete("/projects/:id", async (req, res) => {
  try {
    const deletedProject = await deleteProjectById(req.params.id);

    if (!deletedProject) {
      res.status(404).json({ error: "Project not found." });
    }

    res.json({
      message: "Project deleted successfully.",
      project: deletedProject,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete project." });
  }
});

// Owner or user
async function createUser(userDetails) {
  try {
    const addNewUser = new User(userDetails);
    const saveNewUser = await addNewUser.save();
    return saveNewUser;
  } catch (error) {
    throw error;
  }
}
app.post("/users", async (req, res) => {
  try {
    const savedUser = await createUser(req.body);
    if (savedUser) {
      res
        .status(201)
        .json({ message: "User added successfully", user: savedUser });
    }
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }

    if (error.name === "ValidationError") {
      const field = Object.keys(error.errors)[0];
      const message = error.errors[field].message;

      return res.status(400).json({
        error: `Invalid Input: '${field}' is required.`,
        details: message,
      });
    }

    res.status(500).json({ error: "Failed to add user." });
  }
});

async function readAllUsers() {
  try {
    const readUsers = await User.find();
    return readUsers;
  } catch (error) {
    throw error;
  }
}
app.get("/users", async (req, res) => {
  try {
    const readUsers = await readAllUsers();

    if (readUsers.length !== 0) {
      res.json(readUsers);
    } else {
      res.status(404).json({ error: "Users not found." });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// Team
async function createTeam(teamDetails) {
  try {
    const addNewTeam = new Team(teamDetails);
    const saveNewTeam = await addNewTeam.save();
    return saveNewTeam;
  } catch (error) {
    throw error;
  }
}
app.post("/teams", verifyJWT, async (req, res) => {
  try {
    const savedTeam = await createTeam(req.body);

    if (savedTeam) {
      return res
        .status(201)
        .json({ message: "Team added successfully.", team: savedTeam });
    }
  } catch (error) {
    if (error.name === "ValidationError") {
      const field = Object.keys(error.errors)[0];
      const message = error.errors[field].message;

      return res.status(400).json({
        error: `Invalid Input '${field}' is required.`,
        details: message,
      });
    }

    res.status(500).json({ error: "Failed to add team." });
  }
});

async function readAllTeams() {
  try {
    const readTeams = await Team.find();
    return readTeams;
  } catch (error) {
    throw error;
  }
}
app.get("/teams", verifyJWT, async (req, res) => {
  try {
    const readTeams = await readAllTeams();

    if (readTeams.length !== 0) {
      res.json(readTeams);
    } else {
      res.status(404).json({ error: "Team not found." });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to get team." });
  }
});

async function getTeamMembers(teamId) {
  try {
    const readAllMembers = await Team.findById(teamId).populate("members");
    return readAllMembers;
  } catch (error) {
    throw error;
  }
}
app.get("/teams/:teamId/members", async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await getTeamMembers(teamId);

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({
      teamId: team._id,
      teamName: team.name,
      members: team.members,
      count: team.members.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch team members" });
  }
});

async function deleteTeamById(teamId) {
  try {
    const deleteTeam = await Team.findByIdAndDelete(teamId);
    return deleteTeam;
  } catch (error) {
    throw error;
  }
}
app.delete("/teams/:teamId", async (req, res) => {
  try {
    const deletedTeam = await deleteTeamById(req.params.teamId);

    if (!deletedTeam) {
      res.status(404).json({ error: "Team not found." });
    }
    res.json({ message: "Team deleted successfully.", team: deletedTeam });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete team." });
  }
});

// Add team members
async function addTeamMembers(teamId, userId) {
  try {
    const team = await Team.findById(teamId);

    if (!team) {
      return null;
    }

    if (!team.members.includes(userId)) {
      team.members.push(userId);
      await team.save();
    }

    return team;
  } catch (error) {
    throw error;
  }
}
app.post("/teams/:teamId/add-member", async (req, res) => {
  try {
    const { teamId } = req.params;
    const { userId } = req.body;

    const team = await addTeamMembers(teamId, userId);

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    return res.json({
      message: "Member added successfully",
      team,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to add member to team" });
  }
});

// Tag
async function createTag(tagDetails) {
  try {
    const addNewTag = new Tag(tagDetails);
    const saveNewTag = await addNewTag.save();
    return saveNewTag;
  } catch (error) {
    throw error;
  }
}
app.post("/tags", verifyJWT, async (req, res) => {
  try {
    const savedTag = await createTag(req.body);

    if (savedTag) {
      return res
        .status(201)
        .json({ message: "Tag added successfully.", tag: savedTag });
    }
  } catch (error) {
    if (error.name === "ValidationError") {
      const field = Object.keys(error.errors)[0];
      const message = error.errors[field].message;

      return res.status(400).json({
        error: `Invalid Input: '${field}' is required.`,
        details: message,
      });
    }

    res.status(500).json({ error: "Failed to add tags." });
  }
});

async function readAllTags() {
  try {
    const readTags = await Tag.find();
    return readTags;
  } catch (error) {
    throw error;
  }
}
app.get("/tags", verifyJWT, async (req, res) => {
  try {
    const readTags = await readAllTags();

    if (readTags.length !== 0) {
      res.json(readTags);
    } else {
      res.status(404).json({ error: "Tag not found." });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to get tags." });
  }
});

// Task
async function createTask(taskDetails) {
  try {
    const addNewTask = new Task(taskDetails);
    const saveNewTask = await addNewTask.save();
    return saveNewTask;
  } catch (error) {
    throw error;
  }
}
app.post("/tasks", async (req, res) => {
  try {
    const savedTask = await createTask(req.body);

    if (savedTask) {
      res
        .status(201)
        .json({ message: "Task added successfully.", task: savedTask });
    }
  } catch (error) {
    if (error.name === "ValidationError") {
      const field = Object.keys(error.errors)[0];
      const message = error.error[field].message;

      res.status(400).json({
        error: `Invalid Input: '${field}' is required.`,
        details: message,
      });
    }

    res.status(500).json({ error: "Failed to add task." });
  }
});

async function readAllTasks(query) {
  try {
    const filter = {};

    // //optional filters
    // project
    if (query.project) {
      const projectDoc = await Project.findOne({
        name: { $regex: `^${query.project}$`, $options: "i" },
      });
      if (!projectDoc) return [];
      filter.project = projectDoc._id;
    }

    // team
    if (query.team) {
      const teamDoc = await Team.findOne({
        name: { $regex: `^${query.team}$`, $options: "i" },
      });
      if (!teamDoc) return [];
      filter.team = teamDoc._id;
    }

    // owner
    if (query.owner) {
      const ownerDoc = await User.findOne({
        name: { $regex: `^${query.owner}$`, $options: "i" },
      });
      if (!ownerDoc) return [];
      filter.owners = ownerDoc._id;
    }

    // tags
    if (query.tags) {
      const tagDoc = await Tag.findOne({
        name: { $regex: `^${query.tags}$`, $options: "i" },
      });
      if (!tagDoc) return [];
      filter.tags = tagDoc._id;
    }

    // status
    if (query.status) {
      filter.status = { $regex: `^${query.status}$`, $options: "i" };
    }

    // due date sort
    const sortQuery = {};
    if (query.sort === "dueDateAsc") {
      sortQuery.dueDate = 1;
    }
    if (query.sort === "dueDateDesc") {
      sortQuery.dueDate = -1;
    }

    // no query passed, fallback to normal fetch
    const readTasks = await Task.find(filter)
      .sort(sortQuery)
      .populate("project")
      .populate("team")
      .populate("owners")
      .populate("tags");

    return readTasks;
  } catch (error) {
    throw error;
  }
}
app.get("/tasks", async (req, res) => {
  // console.log("QUERY RECEIVED:", req.query);
  try {
    const readTasks = await readAllTasks(req.query);
    if (readTasks.length !== 0) {
      res.json(readTasks);
    } else {
      res.status(404).json({ error: "Tasks not found." });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks." });
  }
});

// Update task status: PUT
async function updateTaskStatus(taskId, status) {
  try {
    const updateStatus = await Task.findByIdAndUpdate(taskId, status, {
      new: true,
    });
    return updateStatus;
  } catch (error) {
    throw error;
  }
}
app.put("/tasks/:id", async (req, res) => {
  try {
    const updatedTask = await updateTaskStatus(req.params.id, req.body);

    if (!updatedTask) {
      res.status(404).json({ error: "Task not found." });
    }

    res.json({ message: "Task marked as complete", task: updatedTask });
  } catch (error) {
    res.status(500).json({ error: "Failed to update task." });
  }
});

// DELETE Task
async function deleteTaskById(id) {
  try {
    const deleteTask = await Task.findByIdAndDelete(id);
    return deleteTask;
  } catch (error) {
    throw error;
  }
}
app.delete("/tasks/:id", async (req, res) => {
  try {
    const deletedTask = await deleteTaskById(req.params.id);

    if (!deletedTask) {
      return res.status(404).json({ error: "Task not found." });
    }

    res.json({
      message: "Task deleted successfully.",
      task: deletedTask,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task." });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
