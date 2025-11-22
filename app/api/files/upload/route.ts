import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { minioClient } from "@/lib/minio";
import { v4 as uuidv4 } from 'uuid';
import { getUserFromToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromToken(req);
        const userId = user?.userId;
    
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        
        if (!file) {
             return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const uniqueName = uuidv4();
        const fileSize = file.size;
        const fileType = file.type;
        const FILESBUCKET = process.env.FILESBUCKET;

        if (!FILESBUCKET) {
            console.error("Environment variable FILESBUCKET is not set");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }
        
      
        const metaData = {
            'Content-Type': fileType
        };

        await minioClient.putObject(
            FILESBUCKET,
            uniqueName,
            buffer,
            fileSize,
            metaData 
        );

        const newFile = await db.files.create({
            data: {
                uuid: uniqueName,
                size: fileSize,
                type: fileType,
                ownerId: userId
            }
        });

        return NextResponse.json({ status: "ok", uuid: newFile.uuid });

    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}