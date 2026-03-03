import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db'; // Vamos criar este arquivo de conexão já já


// Função para registrar um novo usuário
export const registerUser = async (req: Request, res: Response) => {
  try {
    // 1. Pega o email e a senha do corpo da requisição
    // const {email , password } = req.body;
    const { password} = req.body;
    const email = req.body.email ? req.body.email.toLowerCase() : undefined ;
    // Validação simples para garantir que os dados foram enviados
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    // 2. Cria um "salt" e "hasheia" a senha
    // O "salt" é um texto aleatório que torna o hash mais seguro
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Insere o novo usuário no banco de dados
    const newUser = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, role, created_at',
      [email, hashedPassword]
    );

    // 4. Retorna uma resposta de sucesso
    res.status(201).json({
      message: 'Usuário criado com sucesso!',
      user: newUser.rows[0],
    });

  } catch (error: any) {
    // Tratamento de erros (ex: email duplicado)
    if (error.code === '23505') { // Código de erro do PostgreSQL para violação de chave única
      return res.status(409).json({ message: 'Este email já está cadastrado.' });
    }
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};


// Nova função para login de usuário
export const loginUser = async (req: Request, res: Response) => {
  try {
    // 1. Pega o email e a senha do corpo da requisição
    const{password}  = req.body;
    const email =req.body.email ? req.body.email.toLowerCase() : undefined;

    // Validação
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    // 2. Procura o usuário no banco de dados pelo email
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    // Se nenhum usuário for encontrado com esse email
    if (userQuery.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas.' }); // Mensagem genérica por segurança
    }

    const user = userQuery.rows[0];

    // 3. Compara a senha enviada com a senha hasheada no banco
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    // Se as senhas não corresponderem
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }
    
    // 4. Se a senha estiver correta, cria o JWT (o "crachá")
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    
    const token = jwt.sign(
      tokenPayload, 
      process.env.JWT_SECRET as string, // Usa a chave secreta do .env
      { expiresIn: '1d' } // Define a validade do token (ex: 1 dia)
    );
      
    // 5. Envia o token de volta para o cliente
    res.status(200).json({
      message: 'Login bem-sucedido!',
      token: token,
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// Função para obter o perfil do usuário autenticado
// Esta função será chamada após o middleware de autenticação
export const getUserProfile = async (req: any, res: Response) => {
  // Graças ao nosso middleware, já temos as informações do usuário em req.user
  // Não precisamos buscar no banco de dados de novo
  const userProfile = {
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
  };
  
  res.status(200).json(userProfile);
};


// Novo controlador para uma rota de teste de admin
export const getAdminData = (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Bem-vindo, Administrador! Você está vendo dados secretos.'
  });
};

// NOVA FUNÇÃO para administradores criarem usuários
export const adminCreateUser = async (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Por favor, adicione email, senha e cargo.' });
  }

  // Validação para garantir que o cargo é um dos permitidos
  if (role !== 'juiz' && role !== 'integrante') {
    return res.status(400).json({ message: 'Cargo inválido. Use "juiz" ou "integrante".' });
  }

  try {
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Usuário já existe.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, hashedPassword, role]
    );

    res.status(201).json({
      id: newUser.rows[0].id,
      email: newUser.rows[0].email,
      role: newUser.rows[0].role,
    });

  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};
