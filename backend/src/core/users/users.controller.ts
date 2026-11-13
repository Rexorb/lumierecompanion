import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ForbiddenException,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserResponseDto } from './dto/user-response.dto';

/** Usuário autenticado injetado pelo JwtAuthGuard (via JwtStrategy) */
type RequisicaoComUsuario = { user: { id: string; tipo: string } };

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Autoexclusão — o alvo vem SEMPRE do JWT (`request.user.id`); nenhum
   * parâmetro é aceito, então esta rota não tem como apagar terceiros.
   * Deve ser declarada ANTES de `@Delete(':id')`, senão "me" casa com
   * o parâmetro genérico.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('me')
  removeMe(@Request() request: RequisicaoComUsuario): Promise<void> {
    return this.usersService.remove(request.user.id);
  }

  /**
   * Exclusão administrativa (ferramenta interna de manutenção).
   * Somente SUPER_ADMIN — papel verificado no usuário do JWT. Usa a
   * mesma rotina transacional da autoexclusão (user-deletion.ts).
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @Request() request: RequisicaoComUsuario,
    @Param('id') id: string,
  ): Promise<void> {
    if (request.user.tipo !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Apenas SUPER_ADMIN pode excluir contas de terceiros',
      );
    }
    return this.usersService.remove(id);
  }
}
