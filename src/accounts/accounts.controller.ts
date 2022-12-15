import { Body, Controller, Get, Param, Post, Query, UseFilters, Put, Inject, LoggerService } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { ExeptionsFilter } from '../exceptions/exceptions.filter';
import { IsNotEmpty, IsEnum, IsString, IsNumber, IsPositive, NotEquals, ValidateIf, IsDate, IsDefined } from 'class-validator';
import { ValidationException } from '../exceptions/exceptions';
import { Type } from 'class-transformer';
import Account, { AccountType } from '../models/account.model';

class AccountCreationRequest {
  @IsString()
  @IsNotEmpty()
  clientName: string;
  @IsString()
  @IsNotEmpty()
  clientDocument: string;
  @Type(type => Date)
  @IsDate()
  clientBirthDate: Date
  @IsEnum(AccountType)
  accountType: AccountType
  @ValidateIf((o, value) => value !== null)
  @IsNumber()
  @IsPositive()
  @NotEquals(0)
  dailyWithdrawalLimit: number
}

class DepositRequest {
  @IsNumber()
  @IsPositive()
  accountId: number;
  @IsNumber()
  @IsPositive()
  @NotEquals(0)
  value: number;
}

class WithdrawalRequest {
  @IsNumber()
  @IsPositive()
  accountId: number;
  @IsNumber()
  @NotEquals(0)
  value: number;
}

class AccountStatementRequest {
  @IsDefined()
  @IsDate()
  @Type(type => Date)
  start: Date;
  @IsDefined()
  @IsDate()
  @Type(type => Date)
  end: Date;
}

@ApiTags('Accounts')
@Controller('account')
@UseFilters(new ExeptionsFilter())
@ApiResponse({
  status: 400,
  schema: {
    type: 'object',
    properties: {
      message: {
        type: 'array',
        items: {
          type: 'string'
        }
      },
      error: {
        type: 'string',
        default: 'Bad Request'
      }
    }
  }
})
export class AccountsController {
  constructor(private service: AccountsService, @Inject('Logger') private logger: LoggerService) { }

  @ApiOperation({ description: 'Creates a new account with the given client and account info. If the client does not already exist, than is created.' })
  @ApiBody({
    schema: {
      properties: {
        clientName: {
          type: 'string'
        },
        clientDocument: {
          type: 'string'
        },
        clientBirthDate: {
          type: 'string',
          format: 'date'
        },
        accountType: {
          type: 'enum',
          enum: [AccountType.Simple, AccountType.Executive]

        },
        dailyWithdrawalLimit: {
          type: 'number',
          minimum: 0,
          nullable: true,
          default: null
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'number'
        }
      }
    }
  })
  @Post('create')
  async create(@Body() accountCreationRequest: AccountCreationRequest) {
    const account: Account = await this.service.createAccount(accountCreationRequest);

    return { accountId: account.accountId };
  }

  @Get(':accountId/statement')
  @ApiOperation({ description: 'Returns an account statement for an account with a given id and date range.' })
  @ApiQuery({ name: 'start', schema: { type: 'string', format: 'date-time' } })
  @ApiQuery({ name: 'end', schema: { type: 'string', format: 'date-time' } })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          transactionId: {
            type: 'integer'
          },
          value: {
            type: 'number'
          },
          transactionDate: {
            type: 'string',
            format: 'date-time'
          },
          accountId: {
            type: 'integer'
          },
          balance: {
            type: 'number'
          }
        }
      }
    }
  })
  async statement(@Param('accountId', { transform: v => Number(v) }) accountId: number,
    @Query() query: AccountStatementRequest) {
    let { start, end } = query;

    if (start > end) {
      [start, end] = [end, start];
      this.logger.log(`${start > end ? 'The start date is later then end' : 'The end date is before then start'} switching dates to correct`);
    }

    if (end === start) {
      throw new ValidationException(`start and end must not be the same date`);
    }

    return this.service.accountStatement(accountId, start, end);
  }

  @Get(':accountId/balance')
  @ApiOperation({ description: 'Returns the current balance of an account with a given id.' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'integer'
        },
        balance: {
          type: 'number'
        }
      }
    }
  })
  async getBalance(@Param('accountId', { transform: (v) => Number(v) }) accountId: number) {
    const account = await this.service.getAccountById(accountId);

    return { accountId: account.accountId, balance: account.balance };
  }

  @ApiOperation({ description: 'Blocks an account with the given account id.' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        updated: {
          type: 'boolean'
        }
      }
    }
  })
  @Put(':accountId/block')
  async block(@Param('accountId', { transform: (v) => Number(v) }) accountId: number) {
    const result = await this.service.blockAccount(accountId);

    return result;
  }


  @ApiBody({
    schema: {
      properties: {
        accountId: {
          type: 'number',
          minimum: 0
        },
        value: {
          type: 'number',
          minimum: 0
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'integer'
        },
        transactionId: {
          type: 'integer'
        },
        transactionDate: {
          type: 'string',
          format: 'date-time'
        },
        value: {
          type: 'number'
        }
      }
    }
  })
  @ApiOperation({ description: 'Deposits to an account.' })
  @Put('deposit')
  async deposit(@Body() depositRequest: DepositRequest) {
    const tranaction = await this.service.deposit(depositRequest.accountId, depositRequest.value);

    return {
      tractionId: tranaction.transactionId,
      value: tranaction.value,
      tranactionDate: tranaction.transactionDate,
      accountId: tranaction.account.accountId
    };
  }

  @ApiBody({
    schema: {
      properties: {
        accountId: {
          type: 'number',
          minimum: 0
        },
        value: {
          type: 'number',
          minimum: 0
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'integer'
        },
        transactionId: {
          type: 'integer'
        },
        transactionDate: {
          type: 'string',
          format: 'date-time'
        },
        value: {
          type: 'number'
        }
      }
    }
  })
  @ApiOperation({ description: 'Withdraws form an account/' })
  @Put('withdraw')
  async withdraw(@Body() withdrawalRequest: WithdrawalRequest) {
    const tranaction = await this.service.withdraw(withdrawalRequest.accountId, withdrawalRequest.value);

    return {
      tractionId: tranaction.transactionId,
      value: tranaction.value,
      tranactionDate: tranaction.transactionDate,
      accountId: tranaction.account.accountId
    };
  }
}
