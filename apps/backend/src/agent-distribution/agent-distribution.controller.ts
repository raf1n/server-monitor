import {
  Controller,
  Get,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

@Controller()
export class AgentDistributionController {
  private readonly agentDistDir: string;
  private readonly controllerDir: string;

  constructor() {
    this.agentDistDir = join(
      __dirname, '..', '..', '..', '..',
      'agent', 'dist',
    );
    this.controllerDir = __dirname;
  }

  @Get('agent.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  getAgentJs(@Res() res: Response) {
    const file = readFileSync(join(this.agentDistDir, 'agent.js'), 'utf-8');
    res.send(file);
  }

  @Get('install.sh')
  @Header('Content-Type', 'text/x-shellscript; charset=utf-8')
  getInstallSh(@Res() res: Response) {
    const file = readFileSync(join(this.agentDistDir, 'install.sh'), 'utf-8');
    res.send(file);
  }

  @Get('agent-info')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  getReadme(@Res() res: Response) {
    const file = readFileSync(join(this.agentDistDir, 'README.md'), 'utf-8');
    res.send(file);
  }
}
