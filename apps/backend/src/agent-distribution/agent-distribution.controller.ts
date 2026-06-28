import {
  Controller,
  Get,
  Req,
  Res,
  Header,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
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
  async getInstallSh(@Req() req: Request, @Res() res: Response) {
    try {
      let file = await readFile(join(this.agentDistDir, 'install.sh'), 'utf-8');
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      file = file.replace(/__BACKEND_URL__/g, baseUrl);
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
