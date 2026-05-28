import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import type { Camera } from './types/index';
import { cameraService } from './api/cameraService';

interface LiveViewModalProps {
    camera: Camera | null;
    visible: boolean;
    onHide: () => void;
}

type StreamStatus = 'idle' | 'connecting' | 'playing' | 'error';

export const LiveViewModal = ({ camera, visible, onHide }: LiveViewModalProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const [status, setStatus] = useState<StreamStatus>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (visible && camera) {
            startStream();
        }
        return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, camera?.id]);

    const stopStream = () => {
        pcRef.current?.close();
        pcRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setStatus('idle');
        setErrorMsg(null);
    };

    const startStream = async () => {
        if (!camera) return;
        setStatus('connecting');
        setErrorMsg(null);

        try {
            const { data } = await cameraService.getStreamInfo(camera.id);

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            });
            pcRef.current = pc;

            pc.ontrack = (evt) => {
                if (videoRef.current && evt.streams[0]) {
                    videoRef.current.srcObject = evt.streams[0];
                }
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'connected') setStatus('playing');
                if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
                    setStatus('error');
                    setErrorMsg('Stream disconnected');
                }
            };

            pc.addTransceiver('video', { direction: 'recvonly' });
            pc.addTransceiver('audio', { direction: 'recvonly' });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const whepResp = await fetch(data.webrtc_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/sdp' },
                body: offer.sdp,
            });

            if (!whepResp.ok) {
                const txt = await whepResp.text().catch(() => '');
                throw new Error(
                    whepResp.status === 404
                        ? 'Stream not ready — camera may be offline or RTSP URL unreachable'
                        : `WHEP error ${whepResp.status}${txt ? ': ' + txt : ''}`
                );
            }

            const answerSdp = await whepResp.text();
            await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

            // Parse trickle-ICE candidates from Link headers (optional, improves connectivity)
            const linkHeader = whepResp.headers.get('Link');
            if (linkHeader) {
                const iceServerMatches = linkHeader.matchAll(/<([^>]+)>;\s*rel="ice-server"/g);
                const iceServers: RTCIceServer[] = [];
                for (const match of iceServerMatches) {
                    iceServers.push({ urls: match[1] });
                }
                if (iceServers.length > 0) {
                    const config = pc.getConfiguration();
                    pc.setConfiguration({ ...config, iceServers });
                }
            }

            setStatus('playing');
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err?.message || 'Failed to connect to stream');
            pcRef.current?.close();
            pcRef.current = null;
        }
    };

    const handleHide = () => {
        stopStream();
        onHide();
    };

    const statusDot = {
        idle:       'bg-gray-400',
        connecting: 'bg-yellow-400 animate-pulse',
        playing:    'bg-green-500',
        error:      'bg-red-500',
    }[status];

    const statusLabel = {
        idle:       'Idle',
        connecting: 'Connecting…',
        playing:    'Live',
        error:      'Disconnected',
    }[status];

    return (
        <Dialog
            visible={visible}
            onHide={handleHide}
            header={
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                        <i className="pi pi-video text-xs" />
                    </div>
                    <span className="font-semibold text-gray-800 truncate max-w-xs">
                        {camera?.name_en ?? 'Live View'}
                    </span>
                </div>
            }
            style={{ width: 'min(95vw, 64rem)' }}
            modal
            closable
            className="live-view-dialog"
        >
            <div className="flex flex-col gap-3">
                {/* Video container */}
                <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    {status === 'connecting' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                            <i className="pi pi-spin pi-spinner text-3xl text-purple-400" />
                            <span className="text-sm text-gray-300">Connecting to stream…</span>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <i className="pi pi-exclamation-triangle text-3xl text-red-400" />
                            <span className="text-sm text-red-300 text-center px-6">{errorMsg}</span>
                            <button
                                onClick={startStream}
                                className="mt-1 px-4 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                        style={{ display: status === 'playing' ? 'block' : 'none' }}
                    />
                </div>

                {/* Status bar */}
                <div className="flex items-center gap-2 px-1 text-sm text-gray-500">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
                    <span className="font-medium">{statusLabel}</span>
                    {camera?.rtsp_url && (
                        <span className="font-mono text-xs text-gray-400 ml-auto truncate max-w-sm">
                            {camera.rtsp_url}
                        </span>
                    )}
                </div>
            </div>
        </Dialog>
    );
};
