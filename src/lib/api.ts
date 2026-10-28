import { db } from "@/lib/db";
import { requireUuid } from "@/lib/uuid";

// ==========================================
// 1. MÓDULO DE ALUNOS (Secretaria / Geral)
// ==========================================
export async function listarAlunosOrdenados() {
  const { data, error } = await db("vw_alunos_ordenados").select("*");
  if (error) throw error;
  return data;
}

// ==========================================
// 2. MÓDULO DE UNIFORMES (Secretaria)
// ==========================================
export async function listarStockUniformes() {
  const { data, error } = await db("uniformes_stock").select("*");
  if (error) throw error;
  return data;
}

export async function adicionarUniformeStock(
  item: string,
  tamanho: string,
  quantidade: number,
  preco: number,
) {
  const { data, error } = await db("uniformes_stock")
    .insert([{ item, tamanho, quantidade_disponivel: quantidade, preco }]);
  if (error) throw error;
  return data;
}

// ==========================================
// 3. MÓDULO DE PAGAMENTOS E FINANÇAS (Tesouraria/Secretaria)
// ==========================================
export async function listarPagamentos() {
  const { data, error } = await db("pagamentos").select("*");
  if (error) throw error;
  return data;
}

export async function registarPagamento(dados: {
  aluno_id: string;
  mes: number;
  valor_pago: number;
  pago: boolean;
  tipo: string;
  data_pagamento: string;
}) {
  requireUuid(dados.aluno_id);
  const { data, error } = await db("pagamentos").insert([dados]);
  if (error) throw error;
  return data;
}

// ==========================================
// 4. MÓDULO DE MINI PAUTAS (Professores)
// ==========================================
export async function guardarMiniPauta(dados: {
  professor_id?: string;
  classe: string;
  turma: string;
  disciplina: string;
  trimestre: string;
  aluno_id: string;
  av1: number;
  av2: number;
  pp: number;
  media_final: number;
}) {
  requireUuid(dados.aluno_id);
  const { data, error } = await db("mini_pautas").insert([dados]);
  if (error) throw error;
  return data;
}

// ==========================================
// 5. MÓDULO DE SUMÁRIOS (Professores)
// ==========================================
export async function registarSumario(dados: {
  professor_id?: string;
  disciplina: string;
  classe: string;
  turma: string;
  data_aula: string;
  sumario: string;
}) {
  const { data, error } = await db("sumarios_professores")
    .insert([dados]);
  if (error) throw error;
  return data;
}
