# BookNotes 📚

A personal book library application where readers can search for books, save them to their collection, rate them, record reading dates, and write personal notes.

## Features

- Search books using the Open Library API.
- View book information and cover images.
- Add books to a personal library.
- Rate books from 1 to 5 stars.
- Write and update personal reading notes.
- Record reading dates.
- Delete books from the collection.
- Sort books by title, rating, and recently read.
- Prevent duplicate book entries.
- Validate ratings and reading dates.
- Handle API and database errors.

## Technologies Used

- Node.js
- Express.js
- PostgreSQL
- EJS
- Axios
- HTML
- CSS
- JavaScript
- Open Library API

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/Husnain200/BookNotes.git
cd BookNotes
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PostgreSQL

Create a PostgreSQL database named:

```sql
CREATE DATABASE booknotes;
```

Connect to the `booknotes` database and execute:

```sql
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    isbn VARCHAR(20),
    cover_id INTEGER,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    notes TEXT,
    date_read DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
DB_USER=your_postgres_username
DB_HOST=localhost
DB_NAME=booknotes
DB_PASSWORD=your_postgres_password
DB_PORT=5432
```

Replace the example values with your PostgreSQL credentials.

**Important:** Never upload your `.env` file or database password to GitHub.

### 5. Run the application

```bash
node index.js
```

Open your browser:

```text
http://localhost:3000
```

## API

Book search and information are retrieved using the [Open Library Search API](https://openlibrary.org/developers/api).

## Project Structure

```text
BookNotes/
├── public/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── main.js
├── views/
│   ├── index.ejs
│   └── search.ejs
├── .gitignore
├── db.js
├── index.js
├── package.json
└── package-lock.json
```

## Author

**Husnain Shafique**

GitHub: [Husnain200](https://github.com/Husnain200)

---
## Screenshots

### BookNotes Homepage

![BookNotes Homepage](screenshots/homepage.png)

Built as a full-stack web development project to practise backend development, database operations, API integration, and server-side rendering.
