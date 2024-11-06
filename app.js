// Importation des dépendances
const express = require('express');
const bcrypt = require('bcryptjs');
const pgp = require('pg-promise')();
const dotenv = require('dotenv');

// Initialiser dotenv pour charger les variables d'environnement
dotenv.config();

// Créer une instance d'Express
const app = express();

// Middleware pour gérer les fichiers JSON et URL-encoded
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Connexion à PostgreSQL
const db = pgp(process.env.DATABASE_URL);

// Middleware pour vérifier si l'utilisateur est admin
const checkAdmin = (req, res, next) => {
    if (req.user && req.user.is_admin) {
        return next();
    }
    return res.status(403).json({ message: 'Accès interdit, administrateur requis.' });
};

// Route pour récupérer tous les articles
app.get('/articles', async (req, res) => {
    try {
        const articles = await db.any('SELECT * FROM articles');
        res.json(articles);
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la récupération des articles.' });
    }
});

// Route pour récupérer un article avec ses commentaires
app.get('/articles/:id', async (req, res) => {
    const articleId = req.params.id;
    try {
        const article = await db.one('SELECT * FROM articles WHERE id = $1', [articleId]);
        const comments = await db.any('SELECT * FROM comments WHERE article_id = $1', [articleId]);
        res.json({ article, comments });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la récupération de l\'article ou des commentaires.' });
    }
});

// Route pour ajouter un commentaire
app.post('/comments', async (req, res) => {
    const { content, article_id, author_id } = req.body;
    if (!content || !article_id || !author_id) {
        return res.status(400).json({ message: 'Contenu, article_id et author_id sont requis.' });
    }

    try {
        const newComment = await db.one(
            'INSERT INTO comments(content, article_id, author_id) VALUES($1, $2, $3) RETURNING *',
            [content, article_id, author_id]
        );
        res.status(201).json(newComment);
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de l\'ajout du commentaire.' });
    }
});

// Route pour ajouter un article (admin)
app.post('/admin/post', checkAdmin, async (req, res) => {
    const { title, content, author_id } = req.body;
    if (!title || !content || !author_id) {
        return res.status(400).json({ message: 'Le titre, le contenu et l\'auteur sont requis.' });
    }

    try {
        const newArticle = await db.one(
            'INSERT INTO articles(title, content, author_id) VALUES($1, $2, $3) RETURNING *',
            [title, content, author_id]
        );
        res.status(201).json({ message: 'Article publié avec succès', article: newArticle });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la publication de l\'article.' });
    }
});

// Démarrer le serveur
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Serveur en cours d'exécution sur http://localhost:${port}`);
});
