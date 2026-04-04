import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as productService from '../services/productService.js';

const createSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  categoryId: z.string().uuid('ID da categoria inválido'),
  brand: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  barcode: z.string().optional(),
  photo: z.string().optional(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  costPrice: z.number().min(0, 'Preço de custo deve ser positivo'),
  taxFreight: z.number().min(0).optional(),
  desiredMarkup: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  minimumPrice: z.number().min(0).optional(),
});

const updateSchema = createSchema.partial();

const validatePriceSchema = z.object({
  productId: z.string().uuid('ID do produto inválido'),
  price: z.number().min(0, 'Preço deve ser positivo'),
});

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, categoryId, brand, page, limit } = req.query;
    const result = await productService.list({
      search: search as string,
      categoryId: categoryId as string,
      brand: brand as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({
      success: true,
      data: result.products,
      pagination: { page: result.page, limit: result.limit, total: result.total },
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.getById(req.params.id);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const product = await productService.create(data, req.user!.userId, req.ip);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSchema.parse(req.body);
    const product = await productService.update(req.params.id, data, req.user!.userId, req.ip);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await productService.remove(req.params.id, req.user!.userId, req.ip);
    res.json({ success: true, data: { message: 'Produto excluído com sucesso' } });
  } catch (error) {
    next(error);
  }
}

export async function getLowStock(req: Request, res: Response, next: NextFunction) {
  try {
    const products = await productService.getLowStockProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
}

export async function validatePrice(req: Request, res: Response, next: NextFunction) {
  try {
    const data = validatePriceSchema.parse(req.body);
    const result = await productService.validatePrice(data.productId, data.price);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
