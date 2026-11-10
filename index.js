
const axios = require("axios");
const express = require("express");
const pool = require("./db");

const app = express();
const PORT = 3000;

app.set("view engine", "ejs");
app.set("views", "./views");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));


// ==========================================
// HOME PAGE: Display and sort books
// ==========================================

app.get("/", async (req, res) => {

    const sortOptions = {
        title: "title ASC",
        rating: "rating DESC NULLS LAST",
        recent: "date_read DESC NULLS LAST"
    };

    const selectedSort = Object.prototype.hasOwnProperty.call(
        sortOptions,
        req.query.sort
    ) ? req.query.sort : "recent";

    const orderBy = sortOptions[selectedSort];

    try {
        const result = await pool.query(
            `SELECT *,
             TO_CHAR(date_read, 'YYYY-MM-DD') AS date_read_input
             FROM books
             ORDER BY ${orderBy}, id DESC`
        );

        res.render("index", {
            books: result.rows,
            selectedSort: selectedSort,
            message: req.query.message || null
        });

    } catch (error) {
        console.error("Error fetching books:", error.message);
        res.status(500).send("Unable to load books.");
    }
});


// ==========================================
// SEARCH BOOKS: Open Library API
// ==========================================

app.get("/search", async (req, res) => {

    const searchQuery = String(req.query.q || "").trim();

    if (!searchQuery) {
        return res.redirect("/");
    }

    try {
        const response = await axios.get(
            "https://openlibrary.org/search.json",
            {
                params: {
                    q: searchQuery,
                    fields: "key,title,author_name,cover_i,isbn,first_publish_year",
                    limit: 10
                },
                timeout: 10000
            }
        );

        const books = Array.isArray(response.data.docs)
            ? response.data.docs
            : [];

        res.render("search", {
            books: books,
            searchQuery: searchQuery,
            error: null
        });

    } catch (error) {

        console.error("Open Library API Error:", error.message);

        res.status(502).render("search", {
            books: [],
            searchQuery: searchQuery,
            error: "Unable to connect to Open Library. Please try again."
        });
    }
});


// ==========================================
// CREATE: Add a book
// ==========================================

app.post("/books", async (req, res) => {

    const title = String(req.body.title || "").trim();
    const author = String(req.body.author || "").trim();
    const isbn = String(req.body.isbn || "").trim();
    const rawCoverId = String(req.body.cover_id || "").trim();

    // Validate submitted information
    if (!title) {
        return res.status(400).send("Book title is required.");
    }

    if (
        title.length > 255 ||
        author.length > 255 ||
        isbn.length > 20
    ) {
        return res.status(400).send(
            "Submitted book information is too long."
        );
    }

    const coverId = rawCoverId ? Number(rawCoverId) : null;

    if (
        coverId !== null &&
        (!Number.isInteger(coverId) || coverId <= 0)
    ) {
        return res.status(400).send("Invalid book cover ID.");
    }

    try {

        // Check whether the book already exists
        const existingBook = await pool.query(
            `SELECT id FROM books
             WHERE (
                 NULLIF($1, '') IS NOT NULL
                 AND isbn = NULLIF($1, '')
             )
             OR (
                 LOWER(title) = LOWER($2)
                 AND LOWER(COALESCE(author, '')) = LOWER($3)
             )
             LIMIT 1`,
            [isbn, title, author]
        );

        // Prevent duplicate books
        if (existingBook.rowCount > 0) {
            return res.redirect("/?message=duplicate");
        }

        // Save the new book
        await pool.query(
            `INSERT INTO books (title, author, isbn, cover_id)
             VALUES ($1, $2, $3, $4)`,
            [
                title,
                author || null,
                isbn || null,
                coverId
            ]
        );

        res.redirect("/");

    } catch (error) {

        // Handle PostgreSQL unique constraint violations
        if (error.code === "23505") {
            return res.redirect("/?message=duplicate");
        }

        console.error("Error saving book:", error.message);
        res.status(500).send("Unable to save book.");
    }
});


// ==========================================
// UPDATE: Edit ratings, notes and dates
// ==========================================

app.post("/books/:id/update", async (req, res) => {

    const bookId = Number(req.params.id);

    const rating = String(req.body.rating ?? "").trim();
    const notes = req.body.notes;
    const date_read = String(req.body.date_read || "").trim();

    const ratingValue = rating === "" ? null : Number(rating);

    // Validate book ID
    if (!Number.isInteger(bookId) || bookId <= 0) {
        return res.status(400).send("Invalid book ID.");
    }

    // Validate rating
    if (
        ratingValue !== null &&
        (!Number.isInteger(ratingValue) ||
         ratingValue < 1 ||
         ratingValue > 5)
    ) {
        return res.redirect("/?message=invalid_rating");
    }

    // Validate reading date
    if (date_read) {

        const validDateFormat = /^\d{4}-\d{2}-\d{2}$/;

        const parsedDate = new Date(`${date_read}T00:00:00Z`);

        // Check date format and actual calendar validity
        if (
            !validDateFormat.test(date_read) ||
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== date_read
        ) {
            return res.redirect("/?message=invalid_date");
        }

        // Minimum allowed reading date
        const minimumDate = "1900-01-01";

        if (date_read < minimumDate) {
            return res.redirect("/?message=old_date");
        }

        // Get today's date in Pakistan
        const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Karachi",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(new Date());

        // Prevent future reading dates
        if (date_read > today) {
            return res.redirect("/?message=future_date");
        }
    }

    // Update the database only after validation
    try {
        const result = await pool.query(
            `UPDATE books
             SET rating = $1,
                 notes = $2,
                 date_read = $3
             WHERE id = $4
             RETURNING id`,
            [
                ratingValue,
                String(notes || "").trim() || null,
                date_read || null,
                bookId
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).send("Book not found.");
        }

        res.redirect("/");

    } catch (error) {
        console.error("Error updating book:", error.message);
        res.status(500).send("Unable to update book.");
    }
});


// ==========================================
// DELETE: Remove a book
// ==========================================

app.post("/books/:id/delete", async (req, res) => {

    const bookId = Number(req.params.id);

    // Validate book ID
    if (!Number.isInteger(bookId) || bookId <= 0) {
        return res.status(400).send("Invalid book ID.");
    }

    try {
        const result = await pool.query(
            "DELETE FROM books WHERE id = $1 RETURNING id",
            [bookId]
        );

        if (result.rowCount === 0) {
            return res.status(404).send("Book not found.");
        }

        res.redirect("/");

    } catch (error) {
        console.error("Error deleting book:", error.message);
        res.status(500).send("Unable to delete book.");
    }
});


// ==========================================
// START THE SERVER
// ==========================================

app.listen(PORT, () => {
    console.log(`BookNotes running at http://localhost:${PORT}`);
});
