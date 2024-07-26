import express from 'express';
import bodyParser from 'body-parser';
import axios from "axios";
import pg from 'pg';
import { config } from 'dotenv';

const db = new pg.Client({
    user: 'postgres',
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DATABASE,
    password: '123@pASSWORD',
    port: process.env.POSTGRES_PORT
});

db.connect();
config();

const app = express();
const port = 3000;
const url = 'https://api.themoviedb.org/3/search/';
let movieCollection = [];
let reviewCollection = [];


app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));




async function getMovie() {
    const movies = await db.query('SELECT * FROM movie');
    const reviews = await db.query('SELECT * FROM reviews');
    reviewCollection = reviews.rows;
    movieCollection = movies.rows
    return movieCollection, reviewCollection;
}



app.get('/', async (req, res) => {
    await getMovie();
    res.render('index.ejs', {movies: movieCollection, reviews: reviewCollection});
});

app.get('/about', (req, res) => {
    res.render('about.ejs');
});

app.get('/help', (req, res) => {
    res.render('help.ejs');
});


app.post('/new', async(req, res) => {
    try {
        const searchKey = req.body["search-keyword"];
        const checkboxValue = req.body.checkbox;
        const params = {
            api_key: process.env.API_KEY,
            query: searchKey
        }; 
        const checkItem = await db.query('SELECT * FROM movie WHERE title = $1', [searchKey]);
        console.log(checkItem.rows)
        
        try {
            const response = await axios.get(`${url}${checkboxValue}`, {params});
            let title = response.data.results[0].name;
            const overview = response.data.results[0].overview;
            const poster = "https://image.tmdb.org/t/p/original/" + response.data.results[0].poster_path;
            
            if(checkboxValue === 'movie'){
                title = response.data.results[0].title;
                await db.query(`INSERT INTO movie (title, overview, cover_photo_url) VALUES ($1, $2, $3)`, [title, overview, poster]);
                res.redirect('/') 
            } else {
                await db.query(`INSERT INTO movie (title, overview, cover_photo_url) VALUES ($1, $2, $3)`, [title, overview, poster]);
                res.redirect('/') 
            }
        } catch (error) {
            res.render('not_found.ejs',{message: `Ooops, The ${checkboxValue === "movie"? "movie" : "tv show"} is not found`});
        }
    } catch (error) {
        console.log(error);
    }
});

app.get('/delete/:id', async(req, res) => {
    const movieId = req.params.id
    await db.query(`DELETE FROM movie WHERE id = $1`, [movieId]);
    res.redirect('/')
});

app.post('/add-review', async (req, res) => {
    try {
        const reviewContent = req.body.review_content;
        const movieId = req.body.movie_id;
        console.log(movieId);
        console.log(reviewContent);
        await  db.query(`INSERT INTO reviews (review_content, movie_id) VALUES ($1, $2)`, [reviewContent, movieId]);
        res.redirect('/')
        
    } catch (error) {
        console.log(error);
    }
});

app.post('/edit-review/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const updatedReview = req.body.updated_review;
        console.log(id)
        await db.query('UPDATE reviews SET review_content = $1 WHERE id = $2', [updatedReview, id]);
        res.redirect('/');
    } catch (error) {
        console.log(error)
    }
});


app.get('/delete-review/:id', async(req, res) => {
    try {
        const id = req.params.id;
        await db.query('DELETE FROM reviews WHERE id = $1', [id]);
        res.redirect('/');
    } catch (error) {
        console.log(error);
    }
});



app.listen(port, () => {
    console.log(`Server running from port ${port}`);
});
