import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createEnhancedTransition,
  getEnhancedTransitions,
  getEnhancedTransitionById,
  updateEnhancedTransition,
  deleteEnhancedTransition,
  createMilestone,
  updateMilestoneStatus,
  getLegacyTransitions,
  createMajorTransition,
  createPersonnelTransition,
  createOperationalChange,
  getMajorTransitions,
  getPersonnelTransitions,
  getOperationalChanges,
  getTransitionCounts,
  CreateEnhancedTransitionInput,
  UpdateEnhancedTransitionInput,
  GetEnhancedTransitionsQuery,
} from './enhanced-transition.service';

export async function createEnhancedTransitionHandler(
  request: FastifyRequest<{ Body: CreateEnhancedTransitionInput }>,
  reply: FastifyReply
) {
  try {
    const transition = await createEnhancedTransition(request.body);
    return reply.code(201).send(transition);
  } catch (error: any) {
    console.error('Create enhanced transition error:', error);
    
    if (error.message === 'Contract not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }

    if (error.message === 'End date must be after start date') {
      return reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create transition' 
    });
  }
}

export async function getEnhancedTransitionsHandler(
  request: FastifyRequest<{ Querystring: GetEnhancedTransitionsQuery }>,
  reply: FastifyReply
) {
  try {
    const transitions = await getEnhancedTransitions(request.query);
    return reply.code(200).send(transitions);
  } catch (error: any) {
    console.error('Get enhanced transitions error:', error);
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch transitions' 
    });
  }
}

export async function getEnhancedTransitionByIdHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const transition = await getEnhancedTransitionById(id);
    return reply.code(200).send(transition);
  } catch (error: any) {
    console.error('Get enhanced transition by ID error:', error);
    
    if (error.message === 'Transition not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch transition' 
    });
  }
}

export async function updateEnhancedTransitionHandler(
  request: FastifyRequest<{ Body: UpdateEnhancedTransitionInput; Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const transition = await updateEnhancedTransition(id, request.body);
    return reply.code(200).send(transition);
  } catch (error: any) {
    console.error('Update enhanced transition error:', error);
    
    if (error.message === 'Transition not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }
    
    if (error.message === 'End date must be after start date') {
      return reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to update transition' 
    });
  }
}

export async function deleteEnhancedTransitionHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const result = await deleteEnhancedTransition(id);
    return reply.code(200).send(result);
  } catch (error: any) {
    console.error('Delete enhanced transition error:', error);
    
    if (error.message === 'Transition not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to delete transition' 
    });
  }
}

export async function createMilestoneHandler(
  request: FastifyRequest<{ 
    Body: { 
      title: string; 
      description?: string; 
      dueDate: string; 
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' 
    }; 
    Params: { transitionId: string } 
  }>,
  reply: FastifyReply
) {
  try {
    const { transitionId } = request.params;
    const milestone = await createMilestone(transitionId, request.body);
    return reply.code(201).send(milestone);
  } catch (error: any) {
    console.error('Create milestone error:', error);
    
    if (error.message === 'Transition not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create milestone' 
    });
  }
}

export async function updateMilestoneStatusHandler(
  request: FastifyRequest<{ 
    Body: { status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'OVERDUE' }; 
    Params: { id: string } 
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { status } = request.body;
    const milestone = await updateMilestoneStatus(id, status);
    return reply.code(200).send(milestone);
  } catch (error: any) {
    console.error('Update milestone status error:', error);
    
    if (error.code === 'P2025') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: 'Milestone not found' 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to update milestone status' 
    });
  }
}

export async function getLegacyTransitionsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const transitions = await getLegacyTransitions();
    return reply.code(200).send(transitions);
  } catch (error: any) {
    console.error('Get legacy transitions error:', error);
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch legacy transitions' 
    });
  }
}

// Level-specific handlers
export async function createMajorTransitionHandler(
  request: FastifyRequest<{ Body: Omit<CreateEnhancedTransitionInput, 'transitionLevel'> }>,
  reply: FastifyReply
) {
  try {
    const transition = await createMajorTransition(request.body);
    return reply.code(201).send(transition);
  } catch (error: any) {
    console.error('Create major transition error:', error);
    
    if (error.message === 'Contract not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }

    if (error.message === 'End date must be after start date') {
      return reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create major transition' 
    });
  }
}

export async function createPersonnelTransitionHandler(
  request: FastifyRequest<{ Body: Omit<CreateEnhancedTransitionInput, 'transitionLevel'> }>,
  reply: FastifyReply
) {
  try {
    const transition = await createPersonnelTransition(request.body);
    return reply.code(201).send(transition);
  } catch (error: any) {
    console.error('Create personnel transition error:', error);
    
    if (error.message === 'Contract not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }

    if (error.message === 'End date must be after start date') {
      return reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create personnel transition' 
    });
  }
}

export async function createOperationalChangeHandler(
  request: FastifyRequest<{ Body: Omit<CreateEnhancedTransitionInput, 'transitionLevel'> }>,
  reply: FastifyReply
) {
  try {
    const transition = await createOperationalChange(request.body);
    return reply.code(201).send(transition);
  } catch (error: any) {
    console.error('Create operational change error:', error);
    
    if (error.message === 'Contract not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }

    if (error.message === 'End date must be after start date') {
      return reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create operational change' 
    });
  }
}

export async function getMajorTransitionsHandler(
  request: FastifyRequest<{ Querystring: Omit<GetEnhancedTransitionsQuery, 'transitionLevel'> }>,
  reply: FastifyReply
) {
  try {
    const result = await getMajorTransitions(request.query);
    return reply.code(200).send(result);
  } catch (error: any) {
    console.error('Get major transitions error:', error);
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch major transitions' 
    });
  }
}

export async function getPersonnelTransitionsHandler(
  request: FastifyRequest<{ Querystring: Omit<GetEnhancedTransitionsQuery, 'transitionLevel'> }>,
  reply: FastifyReply
) {
  try {
    const result = await getPersonnelTransitions(request.query);
    return reply.code(200).send(result);
  } catch (error: any) {
    console.error('Get personnel transitions error:', error);
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch personnel transitions' 
    });
  }
}

export async function getOperationalChangesHandler(
  request: FastifyRequest<{ Querystring: Omit<GetEnhancedTransitionsQuery, 'transitionLevel'> }>,
  reply: FastifyReply
) {
  try {
    const result = await getOperationalChanges(request.query);
    return reply.code(200).send(result);
  } catch (error: any) {
    console.error('Get operational changes error:', error);
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch operational changes' 
    });
  }
}

export async function getTransitionCountsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const counts = await getTransitionCounts();
    return reply.code(200).send(counts);
  } catch (error: any) {
    console.error('Get transition counts error:', error);
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch transition counts' 
    });
  }
}