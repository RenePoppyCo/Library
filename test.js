const express = require('express');
const app = express();

app.use(express.json());

app.post('/books/checkout/:id', (req, res) => {
  console.log('Checkout route accessed');
  console.log('Book ID:', req.params.id);
  res.status(200).json({ message: 'works' });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));