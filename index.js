const express = require('express');
const bodyParser = require('body-parser');
const cors = require("cors");
const app = express();
const PORT = 3001;

const { MongoClient, ObjectID } = require('mongodb');

const uri = 'mongodb+srv://renecarbajal2017:Mongo562e27rR!@cluster0.6wcyt0v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri);

app.use(cors());
app.use(bodyParser.json());
app.use(express.json()); // <==== parse request body as JSON
app.use(express.urlencoded({ extended: true }));

//Rickster's CORS middleware handler
app.use(function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods',
    'GET,PUT,POST,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers',
     'Content-Type, Authorization, Content-Length, X-Requested-With');
    if (req.method === "OPTIONS") res.sendStatus(200);
    else next();
});

const initialBooks = [
    { id: "0", title: "Reactions in REACT",
    author:"Ben Dover", publisher: "Random House",
    isbn: "978-3-16-148410-0", avail: true },
    { id: "1", title: "Express-sions",
    author:"Frieda Livery", publisher: "Chaotic House",
    isbn: "978-3-16-148410-2", avail: true },
    { id: "2", title: "RESTful Rest",
    author:"Al Gorithm", publisher: "ACM Publishers",
    isbn: "978-3-16-143310-1", avail: true },
    { id: "3", title: "See Es Es",
    author:"Anna Log", publisher: "O'Reilly",
    isbn: "987-6-54-148220-1", avail: false,
    who: "Homer", due:"1/1/23" },
    { id: "4", title: "Scripting in Javascript",
    author:"Dee Gital", publisher: "IEEE",
    isbn: "987-6-54-321123-1", avail: false,
    who: "Marge", due: "1/2/23" },
    { id: "5", title: "HTML Heros",
    author:"Jen Neric", publisher: "self",
    isbn: "987-6-54-321123-2", avail: false,
    who: "Lisa", due: "1/3/23" },
    { id: "6", title: "Legend of Zelda",
    author:"Link Hyrule", publisher: "Hyrule Kingdom",
    isbn: "987-6-54-325123-2", avail: false,
    who: "Rene", due: "05/24/24" },
    { id: "7", title: "The Art of War",
    author:"Sun Tzu", publisher: "Military Press",
    isbn: "978-0-123-45678-9", avail: true,
    who: "", due: "" },
    { id: "8", title: "Malenia, Blade of Miquella",
    author:"Finlay", publisher: "LB",
    isbn: "987-6-54-327623-2", avail: false,
    who: "Millicent ", due: "06/20/24" },
    { id: "9", title: "Taz",
    author:"rah", publisher: "ree",
    isbn: "987-6-54-327663-2", avail: true,
    who: "", due: "" },
    ] ;

async function main() {
    try {
        // app.get('/test', (req, res) => {
        //     res.json({ message: 'hiii!' });
        //   });
        await client.connect();
        const db = client.db("library");
        const booksCollection = db.collection("books");

        // Initialize the database w/ values. First we'll check if the collection is empty        
        const count = await booksCollection.countDocuments();
        if (count === 0) {
            await booksCollection.insertMany(initialBooks);
            console.log("Initialized db with initial books!");
        } else {
            console.log("Db already initalized :)");
        }

        app.get("/", (req, res) =>{
            res.json("Helloooo!");
        });
        

        // add a book
        app.post('/books', async (req, res) => {
            const newBook = req.body;
            const result = await booksCollection.findOne({ id: newBook.id });
            if (result) {
                return res.status(409).send('We already have this book!!');
            }
            await booksCollection.insertOne(newBook);
            res.status(201).send(newBook);
        });                  

        // list all books
        app.get('/books', async (req, res) => {
            try {
              const books = await booksCollection.find({}).toArray(); 
              res.json(books);
            } catch (error) {
              res.status(500).send('Error retrieving books from the database');
            }
          });
          
        
        // list available books ---------------------------
        app.get('/books/available', async (req, res) => {
            try {
                // Fetches all books where avail is true
                const availableBooks = await booksCollection.find({ avail: true }).toArray();
                res.json(availableBooks);
              } catch (error) {
                console.error("Failed to retrieve available books:", error); // Better error logging
                res.status(500).send('Error retrieving available books from the database');
              }
        });

        // list checked-out books ---------------------------
        app.get('/books/notavailable', async (req, res) => {
            try {
                // Fetches all books where avail is flase
                const availableBooks = await booksCollection.find({ avail: false }).toArray();
                res.json(availableBooks);
              } catch (error) {
                console.error("Failed to retrieve available books:", error); // Better error logging
                res.status(500).send('Error retrieving available books from the database');
              }
        });
        
        // get a book by id
        app.get('/books/:id', async (req, res) => {
            console.log('Route /books/checkout/:id accessed');
            console.log('Request ID:', req.params.id);
            const book = await booksCollection.findOne({ id: req.params.id });
            if (book) {
                res.status(200).send(book);
            } else {
                res.status(404).send('erm, that is not here...');
            }
        });

        // update a book 
        app.put('/books/:id', async (req, res) => {
            const updatedBook = req.body;
            const result = await booksCollection.updateOne({ id: req.params.id }, { $set: updatedBook });
            if (result.matchedCount === 0) {
                return res.status(404).send('Can not update, as it does not exist.');
            }
            res.status(200).send(updatedBook);
        });

        // check out / check in a book ---------------------------
        app.patch('/books/update/:id', async (req, res) => {
            console.log('Request id:', req.params.id);
            console.log('Request who:', req.body.who);
            console.log('Request due:', req.body.due);

            const { id } = req.params;
            const { avail, who, due } = req.body;

            if (!avail && (!who || !due)) {
                return res.status(400).json({ message: 'Please include who checkout and when it is due' });
            }

            try {
                const result = await booksCollection.updateOne(
                    { id: id },
                    { $set: { 
                        avail: avail,
                        who : who,
                        due: due                    
                      } 
                    }
                );
        
                if (result.matchedCount === 0) {
                    return res.status(404).json({ message: 'not here :[' });
                }
        
                res.json({ message: 'Book availability updated successfully!' });
            } catch (error) {
                res.status(500).json({ message: 'Error updating the book.', error: error.message });
            }
        });

        // remove a book
        app.delete('/books/:id', async (req, res) => {
            const result = await booksCollection.deleteOne({ id: req.params.id });
            if (result.deletedCount === 0) {
                return res.status(404).send('Never existed to begin with.');
            }
            res.status(204).send();
        });

        app.listen(PORT, () => {
            console.log(`listening at http://localhost:${PORT}`);
        });
    } catch (e) {
        console.error(e);
    }
}

main();
