import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';


// Estendemos a interface Request do Express para adicionar nossa propriedade 'user'
// Isso é um truque do TypeScript para ele entender que req.user existe
interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  // 1. Verifica se o token foi enviado no cabeçalho da requisição
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 2. Extrai o token do cabeçalho (formato: "Bearer TOKEN...")
      token = req.headers.authorization.split(' ')[1];

      // 3. Verifica se o token é válido usando nossa chave secreta
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; email: string; role: string };
      
      // 4. Se o token for válido, anexa os dados do usuário à requisição
      // Isso permite que as próximas funções (os controladores) saibam quem é o usuário
      req.user = decoded;
      
      // 5. Chama a próxima função/middleware na cadeia
      next();
    } catch (error) {
      console.error('Erro na autenticação do token:', error);
      res.status(401).json({ message: 'Não autorizado, token inválido.' });
    }
  }

  // Se não houver nenhum token no cabeçalho
  if (!token) {
    res.status(401).json({ message: 'Não autorizado, sem token.' });
  }
};

// Esta é uma função que retorna outra função (um conceito chamado 'higher-order function').
// Isso nos permite passar os cargos permitidos como argumentos.
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Verificamos se o usuário foi anexado à requisição pelo middleware 'protect'
    if (!req.user) {
      return res.status(401).json({ message: 'Não autorizado.' });
    }
    
    // Verificamos se o cargo do usuário está na lista de cargos permitidos
    if (!roles.includes(req.user.role)) {
      // Se o cargo não estiver na lista, retornamos um erro de "Proibido"
      return res.status(403).json({ message: `Acesso negado. Rota permitida apenas para: ${roles.join(', ')}.` });
    }
    
    // Se o cargo for permitido, deixamos a requisição continuar
    next();
  };
};