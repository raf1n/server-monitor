import {
  Controller,
  Get,
  Res,
  Header,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Public } from '../auth/public.decorator';

@Public()
@Controller()
export class AgentDistributionController {
  private readonly agentDistDir: string;
  private readonly logger = new Logger(AgentDistributionController.name);

  constructor() {
    this.agentDistDir =
      process.env.AGENT_DIST_DIR ||
      join(__dirname, '..', '..', '..', 'agent', 'dist');
  }

  @Get('agent.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  async getAgentJs(@Res() res: Response) {
    try {
      const file = await readFile(join(this.agentDistDir, 'agent.js'), 'utf-8');
      res.send(file);
    } catch {
      this.logger.error('Failed to read agent.js');
      res.status(404).send('Not found');
    }
  }

  @Get('install.sh')
  @Header('Content-Type', 'text/x-shellscript; charset=utf-8')
  async getInstallSh(@Res() res: Response) {
    try {
      const file = await readFile(join(this.agentDistDir, 'install.sh'), 'utf-8');
      res.send(file);
    } catch {
      this.logger.error('Failed to read install.sh');
      res.status(404).send('Not found');
    }
  }

  @Get('agent-info')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  async getReadme(@Res() res: Response) {
    try {
      const file = await readFile(join(this.agentDistDir, 'README.md'), 'utf-8');
      res.send(file);
    } catch {
      this.logger.error('Failed to read agent-info');
      res.status(404).send('Not found');
    }
  }
}
