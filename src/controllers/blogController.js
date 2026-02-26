import Blog from "../models/Blog.js";

/* ================= UTIL ================= */
function makeSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/* reading time: ~200 words/min */
function calculateReadingTime(html) {
  if (!html) return 0;
  const text = html.replace(/<[^>]*>/g, " ").trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.max(1, Math.ceil(words / 200));
}

/* ================= CREATE ================= */
export const createBlog = async (req, res) => {
  try {
    const { title, content, featured, status } = req.body;
    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content required" });
    }

    const slug = makeSlug(title);
    const readingTime = calculateReadingTime(content);

 

    const blog = await Blog.create({
      title,
      slug,
      content,
      tags,
      featured: !!featured,
      status: status || "draft",
      readingTime,
      mainImage: req.file
        ? req.file.path.replace(/\\/g, "/").replace(/^src\//, "")
        : ""
    });

    res.status(201).json({ success: true, blog });
  } catch (err) {
    console.error("CREATE BLOG ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= UPDATE ================= */
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, featured, status } = req.body;
    const tags = req.body.tags ? JSON.parse(req.body.tags) : undefined;

    if (!id || id === "null") {
      return res.status(400).json({ message: "Invalid blog ID" });
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    if (title) {
      blog.title = title;
      blog.slug = makeSlug(title);
    }

    if (content) {
      blog.content = content;
      blog.readingTime = calculateReadingTime(content);
    }

    if (tags) blog.tags = tags;
    if (status) blog.status = status;

    if (featured !== undefined) {
      
      blog.featured = featured;
    }

    if (req.file) {
      blog.mainImage = req.file.path
        .replace(/\\/g, "/")
        .replace(/^src\//, "");
    }

    await blog.save();
    res.json({ success: true, blog });
  } catch (err) {
    console.error("UPDATE BLOG ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= DELETE ================= */
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE BLOG ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= ADMIN GET ================= */
export const getAllBlogsAdmin = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json({ success: true, blogs });
  } catch (err) {
    console.error("GET ADMIN BLOGS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPublishedBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find({ status: "published" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ success: true, blogs });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= USER GET BY SLUG ================= */
export const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({
      slug: req.params.slug,
      status: "published"
    });

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.json({ success: true, blog });
  } catch (err) {
    console.error("GET BLOG BY SLUG ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
