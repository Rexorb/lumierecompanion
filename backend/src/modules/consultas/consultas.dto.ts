import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BaseListQueryDto {
  @IsString()
  @MaxLength(128)
  salaoId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}

export class ClientesListQueryDto extends BaseListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;
}

export class AgendamentosListQueryDto extends BaseListQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsIn(['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'CONCLUIDO', 'FALTOU'])
  status?: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO' | 'CONCLUIDO' | 'FALTOU';
}
