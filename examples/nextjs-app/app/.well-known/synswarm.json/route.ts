import { NextResponse } from 'next/server';
import { geoNode, siteOrigin } from '../../../lib/synswarm';

export function GET() {
  const document = geoNode.buildDiscoveryDocument({
    fingerprintLevel: 1,
  });

  return NextResponse.json(
    {
      ...document,
      discovery: {
        linkRel: 'synswarm-discovery',
        updatedAt: new Date().toISOString(),
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        Link: `<${siteOrigin}/.well-known/synswarm.json>; rel="synswarm-discovery"`,
      },
    },
  );
}
